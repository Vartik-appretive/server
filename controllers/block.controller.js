const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Block = require('../models/block.model');
const validateID = require('../utils/validateId');
const User = require('../models/users.model');

exports.getBlockedUser = catchAsync(async (req, res, next) => {
	const user = req.user;
	// const data = req.body;

	const find = {};
	find.blockedBy = user._id;
	// let fields;
	// const queryFields = req.query.fields;
	// if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 20;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocuments = await Block.countDocuments(find);
	// const docs = Block.find(find).skip(skip).limit(limit).select(fields).sort({ _id: 1 });
	const docs = await Block.aggregate([
		{ $match: find },
		{ $skip: skip },
		{ $limit: limit },
		{ $sort: { _id: sort } },
		{
			$lookup: {
				from: "users", localField: "blockedUser", foreignField: "_id", as: "user",
				// pipeline: [
				// 	{ $project: { name: 1 } }
				// ]
			}
		},
		{ $project: { _id: 0, "user._id": 1, "user.name": 1, "user.profilePhoto": 1, "user.mobile": 1 } },
		{ $unwind: "$user" }
	]);
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: `total ${totalPages} pages found`,
		totalPages,
		result: docs
	});
});

exports.blockUser = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { blockedUser } = req.body;

	if (!blockedUser) return next(new AppError("User id must be provided", 400));
	if(blockedUser === user._id.toString()) return next(new AppError("Bad request", 400));
	if (!validateID(blockedUser)) return next(new AppError("Invalid user id", 400));

	const astroUser = await User.findById(blockedUser, 'role');
	if (!astroUser) return next(new AppError("No user with id '" + blockedUser + "'", 404));

	if (astroUser.role !== 'user') return next(new AppError("User is not a user", 403));

	res.json({
		status: "success",
		message: "Block request processed"
	});

	const blockedUser_blockedBy = `${blockedUser.toString()}-${user._id.toString()}`;
	const data = { blockedBy: user._id, blockedUser, blockedUser_blockedBy };

	const preFollow = await Block.findOne({blockedUser_blockedBy});
	if(preFollow) return;

	await Block.create(data);
});

exports.unblockUser = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { blockedUser } = req.body;

	if (!blockedUser) return next(new AppError("User id must be provided", 400));
	if(blockedUser === user._id.toString()) return next(new AppError("Bad request", 400));
	if (!validateID(blockedUser)) return next(new AppError("Invalid user id", 400));

	const astroUser = await User.findById(blockedUser, 'role');
	if (!astroUser) return next(new AppError("No user with id '" + blockedUser + "'", 404));

	if (astroUser.role !== 'user') return next(new AppError("User is not a user", 403));

	res.json({
		status: "success",
		message: "Unblock request processed"
	});

	const blockedUser_blockedBy = `${blockedUser.toString()}-${user._id.toString()}`;

	await Block.findOneAndDelete({ blockedUser_blockedBy });
});

exports.isBlocked = catchAsync(async (req, res, next) => {
	const user = req.user;
	const {id} = req.body;

	if(!id) return next(new AppError("id is required", 400));
	// if(!role) return next(new AppError("role is required", 400));

	let blockedUser_blockedBy;
	if(user.role === 'user') blockedUser_blockedBy = `${user._id.toString()}-${id}`;
	else blockedUser_blockedBy = `${id}-${user._id.toString()}`;


	const result = {
		blocked: true
	};
	const data = await Block.findOne({blockedUser_blockedBy});
	if(!data) result.blocked = false;

	res.json({
		status: 'success',
		message: 'request processed successfully',
		result
	});
});