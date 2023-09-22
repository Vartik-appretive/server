const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Follow = require('../models/follow.model');
const validateID = require('../utils/validateId');
const User = require('../models/users.model');
const Block = require('../models/block.model');

exports.getFollowerOfUser = catchAsync(async (req, res, next) => {
	const user = req.user;
	// const data = req.body;

	const find = {};
	find.followingId = user._id;
	// let fields;
	// const queryFields = req.query.fields;
	// if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 20;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const blockedUser = await Block.find({ blockedBy: user._id.toString() }, 'blockedUser');
	const blockedByAstrologers = blockedUser.map(user => user.blockedUser);

	find.userId = { $nin: blockedByAstrologers };

	const totalDocuments = await Follow.countDocuments(find);
	// const docs = Follow.find(find).skip(skip).limit(limit).select(fields).sort({ _id: 1 });
	const docs = await Follow.aggregate([
		{ $match: find },
		{ $skip: skip },
		{ $limit: limit },
		{ $sort: { _id: sort } },
		{
			$lookup: {
				from: "users", localField: "userId", foreignField: "_id", as: "follower",
				// pipeline: [
				// 	{ $project: { _id: 0, name: 1 } }
				// ]
			}
		},
		{ $project: { _id: 0, "follower._id": 1, "follower.name": 1, "follower.profilePhoto": 1, "follower.mobile": 1 } },
		{ $unwind: "$follower" }
	]);
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: `total ${totalPages} pages found`,
		totalPages,
		result: docs
	});
});

exports.getFollowingOfUser = catchAsync(async (req, res, next) => {
	const user = req.user;
	// const data = req.body;

	const find = {};
	find.userId = user._id;
	// let fields;
	// const queryFields = req.query.fields;
	// if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 20;
	const skip = (page - 1) * limit;

	const totalDocuments = await Follow.countDocuments(find);
	// const docs = Follow.find(find).skip(skip).limit(limit).select(fields).sort({ _id: 1 });
	const docs = Follow.aggregate([
		{ $match: find },
		{
			$lookup: {
				from: "users", localField: "followingId", foreignField: "_id", as: "following",
				pipeline: [
					{ $project: { _id: 0, name: 1 } }
				]
			}
		},
		{ $project: { following: 1 } },
		{ $skip: skip },
		{ $limit: limit },
		{ $sort: { _id: sort } }
	]);
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: `total ${totalPages} pages found`,
		totalPages,
		result: docs
	});
});

exports.getFollowingOrNot = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { astrologerId } = req.body;

	if (!astrologerId) return next(new AppError("Astrologer id must be provided", 400));
	if (astrologerId === user._id.toString()) return next(new AppError("Bad request", 400));
	if (!validateID(astrologerId)) return next(new AppError("Invalid astrologer id", 400));

	const userFollowerId = `${user._id.toString()}-${astrologerId.toString()}`;

	const doc = await Follow.findOne({ userFollowerId });

	const result = {
		status: "success",
		message: "You are following this astrologer"
	};

	if (!doc) {
		result.status = "fail";
		result.message = "You are not following this astrologer";
	}

	res.json(result);

});

exports.followAstrologer = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { astrologerId } = req.body;

	if (!astrologerId) return next(new AppError("Astrologer id must be provided", 400));
	if (astrologerId === user._id.toString()) return next(new AppError("Bad request", 400));
	if (!validateID(astrologerId)) return next(new AppError("Invalid astrologer id", 400));

	const astroUser = await User.findById(astrologerId, 'role');
	if (!astroUser) return next(new AppError("No astrologer with id '" + astrologerId + "'", 404));

	if (astroUser.role !== 'astrologer') return next(new AppError("User is not an astrologer", 403));

	res.json({
		status: "success",
		message: "Follow request processed"
	});

	const userFollowerId = `${user._id.toString()}-${astrologerId.toString()}`;
	
	const preFollow = await Follow.findOne({ userFollowerId });
	if (preFollow) return;
	
	const data = { userId: user._id, followingId: astrologerId, userFollowerId };
	
	const afterFollow = await Follow.create(data);
	if (afterFollow) await User.findByIdAndUpdate(astrologerId, { $inc: { followers: 1 } });
});

exports.unfollowAstrologer = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { astrologerId } = req.body;

	if (!astrologerId) return next(new AppError("Astrologer id must be provided", 400));
	if (astrologerId === user._id.toString()) return next(new AppError("Bad request", 400));
	if (!validateID(astrologerId)) return next(new AppError("Invalid astrologer id", 400));

	const astroUser = await User.findById(astrologerId, 'role');
	if (!astroUser) return next(new AppError("No astrologer with id '" + astrologerId + "'", 404));

	if (astroUser.role !== 'astrologer') return next(new AppError("User is not an astrologer", 403));

	res.json({
		status: "success",
		message: "Unfollow request processed"
	});

	const userFollowerId = `${user._id.toString()}-${astrologerId.toString()}`;

	const preFollow = await Follow.findOneAndDelete({ userFollowerId });
	if (preFollow) await User.findByIdAndUpdate(astrologerId, { $inc: { followers: -1 } });
});