const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Favourite = require('../models/favourite.model');
const validateID = require('../utils/validateId');
const User = require('../models/users.model');

// exports.getUserLikes = catchAsync(async (req, res, next) => {
// 	const user = req.user;
// 	// const data = req.body;

// 	const find = {};
// 	find.likedId = user._id;
// 	// let fields;
// 	// const queryFields = req.query.fields;
// 	// if (queryFields) fields = queryFields.split(',').join(' ');

// 	const page = parseInt(req.query.page) || 1;
// 	const limit = parseInt(req.query.limit) || 20;
// 	const skip = (page - 1) * limit;

// 	const totalDocuments = await Favourite.countDocuments(find);
// 	// const docs = Favourite.find(find).skip(skip).limit(limit).select(fields).sort({ _id: 1 });
// 	const docs = Favourite.aggregate([
// 		{ $match: find },
// 		{
// 			$lookup: {
// 				from: "users", localField: "user", foreignField: "_id", as: "favourite",
// 				pipeline: [
// 					{ $project: { _id: 0, name: 1 } }
// 				]
// 			}
// 		},
// 		{ $project: { favourite: 1 } },
// 		{ $skip: skip },
// 		{ $limit: limit },
// 		{ $sort: { _id: sort } }
// 	]);
// 	const totalPages = Math.ceil(totalDocuments / limit);

// 	res.json({
// 		status: 'success',
// 		message: `total ${totalPages} pages found`,
// 		totalPages,
// 		result: docs
// 	});
// });

exports.addFavouriteAstrologer = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { astrologerId } = req.body;

	if (!astrologerId) return next(new AppError("Astrologer id must be provided", 400));
	if (!validateID(astrologerId)) return next(new AppError("Invalid astrologer id", 400));

	const astroUser = await User.findById(astrologerId, 'role');
	if (!astroUser) return next(new AppError("No astrologer with id '" + astrologerId + "'", 404));

	if (astroUser.role !== 'astrologer') return next(new AppError("User is not an astrologer", 403));

	res.json({
		status: "success",
		message: "Like request processed"
	});

	const uaid = `${user._id.toString()}-${astrologerId.toString()}`;
	const data = { user: user._id, astrologer: astrologerId, uaid };

	const doc = Favourite.findOne({ uaid }, 'uaid');
	if (doc) return;

	await Favourite.findOneAndUpdate({ uaid }, data, { upsert: true });
	await User.findByIdAndUpdate(astrologerId, { $inc: { favourite: 1 } });
});

exports.removeFavouriteAstrologer = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { astrologerId } = req.body;

	if (!astrologerId) return next(new AppError("Astrologer id must be provided", 400));
	if (!validateID(astrologerId)) return next(new AppError("Invalid astrologer id", 400));

	const astroUser = await User.findById(astrologerId, 'role');
	if (!astroUser) return next(new AppError("No astrologer with id '" + astrologerId + "'", 404));

	if (astroUser.role !== 'astrologer') return next(new AppError("User is not an astrologer", 403));

	res.json({
		status: "success",
		message: "Unlike request processed"
	});

	const uaid = `${user._id.toString()}-${astrologerId.toString()}`;

	await Favourite.findOneAndDelete({ uaid });
	await User.findByIdAndUpdate(astrologerId, { $inc: { favourite: -1 } });
});

exports.getFavouriteOrNot = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { astrologerId } = req.body;

	if (!astrologerId) return next(new AppError("Astrologer id must be provided", 400));
	if (astrologerId === user._id.toString()) return next(new AppError("Bad request", 400));
	if (!validateID(astrologerId)) return next(new AppError("Invalid astrologer id", 400));

	const uaid = `${user._id.toString()}-${astrologerId.toString()}`;

	const doc = await Favourite.findOne({ uaid });

	const result = {
		status: "success",
		message: "You have liked this astrologer"
	};

	if (!doc) {
		result.status = "fail";
		result.message = "You have not liked this astrologer";
	}

	res.json(result);
});