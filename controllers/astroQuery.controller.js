const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const AstroQuery = require('../models/astroQuery.model');

const types = ["profileOne", "profileTwo"];

exports.getAstroQuery = catchAsync(async (req, res, next) => {
	const user = req.user;

	const doc = await AstroQuery.findOne({ user: user._id });
	if (!doc) return next(new AppError("No Profiles for this user", 404));

	res.json({
		status: 'success',
		message: 'profile fetched successfully',
		result: doc
	});
});

exports.getAstroQueryByUserId = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new AppError("Id of updating doc is required", 400));
	if (!validateID(id)) return next(new AppError("Not a valid id", 400));

	const doc = await AstroQuery.findOne({ user: id });
	if (!doc) return next(new AppError("No Profiles for this user", 404));

	res.json({
		status: 'success',
		message: 'profile fetched successfully',
		result: doc
	});
});

exports.addAstroQuery = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { profileOne, profileTwo } = req.body;

	if (!profileOne && !profileTwo) return next(new AppError("Empty request found", 400));

	const data = {
		user: user._id,
		$push: {
			profileOne: profileOne,
			profileTwo: profileTwo
		},
	};

	const doc = await AstroQuery.findOneAndUpdate({ user: user._id }, data, { new: true, upsert: true });

	res.json({
		status: 'success',
		message: 'profile added successfully',
		result: doc
	});
});

exports.updateAstroQuery = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { id } = req.params;
	const { profileOne, profileTwo } = req.body;

	if (!id) return next(new AppError("Id of updating doc is required", 400));
	if (!validateID(id)) return next(new AppError("Not a valid id", 400));
	if (!profileOne && !profileTwo) return next(new AppError("Empty request found", 400));

	const query = { user: user._id, };
	if (profileOne) query["profileOne._id"] = id;
	if (profileTwo) query["profileTwo._id"] = id;

	const data = {};
	if (profileOne) data["$set"] = { "profileOne.$": profileOne };
	if (profileTwo) data["$set"] = { "profileTwo.$": profileTwo };

	const doc = await AstroQuery.findOneAndUpdate(query, data, { new: true });
	if (!doc) return next(new AppError("No profile with this id", 404));

	res.json({
		status: 'success',
		message: 'profile updated successfully',
		result: doc
	});
});

exports.deleteAstroQuery = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { id } = req.params;
	const type = req.query.type;

	if (!id) return next(new AppError("Id of updating doc is required", 400));
	if (!validateID(id)) return next(new AppError("Not a valid id", 400));
	if (!type) return next(new AppError("Type of updating doc is required", 400));
	if (types.indexOf(type) === -1) return next(new AppError(`type must be from ${types.join(", ")}`, 400));

	const query = { user: user._id };

	const data = {};
	if (type === "profileOne") {
		query["profileOne._id"] = id;
		data["profileOne"] = { _id: id };
	}

	if (type === "profileTwo") {
		query["profileTwo._id"] = id;
		data["profileTwo"] = { _id: id };
	}

	const doc = await AstroQuery.findOneAndUpdate(query, { $pull: data }, { new: true });
	if (!doc) return next(new AppError("No profile with this id", 404));

	res.json({
		status: 'success',
		message: 'profile updated successfully',
		result: doc
	});
});