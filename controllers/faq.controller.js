const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const Faq = require('../models/faq.model');

exports.getFaqs = catchAsync(async (req, res, next) => {
	const find = {};

	const sort = parseInt(req.query.sort) || 1;

	const docs = await Faq.find(find).sort({ index: sort });

	res.json({
		status: 'success',
		message: 'Documents fetched successfully.',
		result: docs
	});
});

exports.getFaqById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const queryFields = req.query.fields;

	if (!id) return next(new AppError('No id specified to query.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	let fields;
	if (queryFields) fields = queryFields.split(',').join(' ');


	const doc = await Faq.findById(id, fields);
	if (!doc) return next(new AppError(`No document with this id: ${id}`, 404));

	res.json({
		status: 'success',
		message: 'Document found.',
		result: doc
	});
});

exports.addFaq = catchAsync(async (req, res, next) => {
	const data = req.body;

	const doc = await Faq.create(data);

	res.json({
		status: 'success',
		message: 'Document added successfully.',
		result: doc
	});
});

exports.updateFaq = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const data = req.body;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	if (_.isEmpty(data)) return next(new AppError('Invalid request.', 406));

	const blog = await Faq.findByIdAndUpdate(id, data, { new: true });
	if (!blog) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document updated successfully.',
		result: blog
	});
});

exports.deleteFaq = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	const blog = await Faq.findByIdAndDelete(id);
	if (!blog) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document deleted successfully.',
		result: blog
	});
});