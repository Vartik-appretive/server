const _ = require('lodash');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const UserAvailability = require('../models/userAvailability.model');

exports.getUserAvailability = catchAsync(async (req, res, next) => {
	const { id: _id } = req.query;

	if (!_id) return next(new AppError('Astrologer id is required', 400));

	const find = { user: _id, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } };

	let fields;
	const queryFields = req.query.fields || 'date';
	if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	// const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocs = await UserAvailability.countDocuments(find);
	const docs = await UserAvailability.find(find).skip(skip).limit(limit).select(fields).sort({ date: 1 });
	const totalPages = Math.ceil(totalDocs / limit);

	res.json({
		status: 'success',
		message: 'Documents fetched.',
		totalPages,
		result: docs
	});
});

exports.getUserAvailabilityById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const queryFields = req.query.fields;

	if (!id) return next(new AppError('No id specified to query.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	let fields;
	if (queryFields) fields = queryFields.split(',').join(' ');


	const doc = await UserAvailability.findById(id, fields);
	if (!doc) return next(new AppError(`No document with this id: ${id}`, 404));

	res.json({
		status: 'success',
		message: 'Document found.',
		result: doc
	});
});

exports.getUserAvailabilityByMonth = catchAsync(async (req, res, next) => {
	const { date } = req.params;
	const queryFields = req.query.fields;

	if (!date) return next(new AppError('No id specified to query.', 400));

	const d = new Date(date);
	if (d == "Invalid Date") return next(new AppError("Invalid date provided.", 400));

	const monthStart = new Date(new Date(d).setHours(0, 0, 0, 0));
	const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

	const find = { date: { $gte: monthStart, $lte: monthEnd } };
	// find.date = {};

	let fields;
	if (queryFields) fields = queryFields.split(',').join(' ');


	const docs = await UserAvailability.find(find);

	res.json({
		status: 'success',
		message: 'Document found.',
		result: docs
	});
});

exports.addUserAvailability = catchAsync(async (req, res, next) => {
	const user = req.user;
	if (user.role !== 'astrologer') return next(new AppError('You are not allowed to access this resource.', 403))

	const data = req.body;
	data.user = user._id;

	const doc = await UserAvailability.create(data);

	res.json({
		status: 'success',
		message: 'Document added successfully.',
		result: doc
	});
});

exports.updateUserAvailability = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const data = req.body;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	if (_.isEmpty(data)) return next(new AppError('Invalid request.', 406));

	const doc = await UserAvailability.findByIdAndUpdate(id, data, { new: true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document updated successfully.',
		result: doc
	});
});

exports.deleteUserAvailability = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { id } = req.params;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	const doc = await UserAvailability.findOneAndDelete({ _id: id, user: user._id });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document deleted successfully.',
		result: null
	});
});