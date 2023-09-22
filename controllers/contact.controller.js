const _ = require('lodash');
const { v4 } = require('uuid');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const Contact = require('../models/contact.model');

exports.getContacts = catchAsync(async (req, res, next) => {
	const find = { 'deleted.trash': false };
	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || 1;
	const skip = (page - 1) * limit;

	const totalDocs = await Contact.countDocuments(find);
	const docs = await Contact.find(find).skip(skip).limit(limit).select(fields).sort({ price: sort });
	const totalPages = Math.ceil(totalDocs / limit);

	res.json({
		status: 'success',
		message: 'Documents fetched.',
		totalPages,
		result: docs
	});
});

exports.getContactById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const queryFields = req.query.fields;

	if (!id) return next(new AppError('No id specified to query.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	let fields;
	if (queryFields) fields = queryFields.split(',').join(' ');


	const doc = await Contact.findById(id, fields);
	if (!doc) return next(new AppError(`No document with this id: ${id}`, 404));

	res.json({
		status: 'success',
		message: 'Document found.',
		result: doc
	});
});

exports.sendContact = catchAsync(async (req, res, next) => {
	const { name, email, message, subject } = req.body;

	await Contact.create({ name, email, message, subject });

	res.json({
		status: 'success',
		message: 'Form submitted successfully.'
	});
});

exports.updateContact = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const data = req.body;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	if (_.isEmpty(data)) return next(new AppError('Invalid request.', 406));

	const doc = await Contact.findByIdAndUpdate(id, data, { new: true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document updated successfully.',
		result: doc
	});
});

exports.deleteContact = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	const doc = await Contact.findByIdAndUpdate(id, { 'deleted.trash': true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document deleted successfully.',
		result: null
	});
});