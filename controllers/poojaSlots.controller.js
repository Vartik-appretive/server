const _ = require('lodash');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const PoojaSlots = require('../models/poojaSlots.model');

exports.getPoojaSlots = catchAsync(async (req, res, next) => {
	const find = { 'deleted.trash': false };
	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');


	if (req.query.by === 'date') {
		const d = new Date(req.query.date);
		const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
		const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59);

		find.date = { $gte: monthStart, $lte: monthEnd };
	}

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || 1;
	const skip = (page - 1) * limit;

	// console.log(find);

	const totalDocs = await PoojaSlots.countDocuments(find);
	const docs = await PoojaSlots.find(find).skip(skip).limit(limit).select(fields).sort({ date: sort });
	const totalPages = Math.ceil(totalDocs / limit);

	res.json({
		status: 'success',
		message: 'Documents fetched.',
		totalPages,
		result: docs
	});
});

exports.getPoojaSlotsById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const queryFields = req.query.fields;

	if (!id) return next(new AppError('No id specified to query.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	let fields;
	if (queryFields) fields = queryFields.split(',').join(' ');


	const doc = await PoojaSlots.findById(id, fields);
	if (!doc) return next(new AppError(`No document with this id: ${id}`, 404));

	res.json({
		status: 'success',
		message: 'Document found.',
		result: doc
	});
});

exports.getPoojaSlotsByMonth = catchAsync(async (req, res, next) => {
	const { date } = req.params;
	// const queryFields = req.query.fields;

	if (!date) return next(new AppError('No id specified to query.', 400));

	const d = new Date(date);
	if (d == "Invalid Date") return next(new AppError("Invalid date provided.", 400));

	const monthStart = new Date(new Date(d).setHours(0, 0, 0, 0));
	const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59);

	const find = { date: { $gte: monthStart, $lte: monthEnd } };
	// find.date = {};

	// let fields;
	// if (queryFields) fields = queryFields.split(',').join(' ');

	const docs = await PoojaSlots.find(find);

	res.json({
		status: 'success',
		message: 'Document found.',
		result: docs
	});
});

exports.addPoojaSlots = catchAsync(async (req, res, next) => {
	const data = req.body;

	const doc = await PoojaSlots.create(data);

	res.json({
		status: 'success',
		message: 'Document added successfully.',
		result: doc
	});
});

exports.updatePoojaSlots = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const data = req.body;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	if (_.isEmpty(data)) return next(new AppError('Invalid request.', 406));

	const doc = await PoojaSlots.findByIdAndUpdate(id, data, { new: true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document updated successfully.',
		result: doc
	});
});

exports.deletePoojaSlots = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	const doc = await PoojaSlots.findByIdAndUpdate(id, { 'deleted.trash': true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document deleted successfully.',
		result: doc
	});
});