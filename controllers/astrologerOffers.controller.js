const _ = require('lodash');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const AstrologerOffers = require('../models/astrologerOffers.model');

exports.getAstrologerOffers = catchAsync(async (req, res, next) => {
	const find = { 'deleted.trash': false };
	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocs = await AstrologerOffers.countDocuments(find);
	const docs = await AstrologerOffers.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
	const totalPages = Math.ceil(totalDocs / limit);

	res.json({
		status: 'success',
		message: 'Documents found.',
		totalPages,
		result: docs
	});
});

exports.getAstrologerOfferById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const queryFields = req.query.fields;

	if (!id) return next(new AppError('No id specified to query.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	let fields;
	if (queryFields) fields = queryFields.split(',').join(' ');


	const doc = await AstrologerOffers.findById(id, fields);
	if (!doc) return next(new AppError(`No document with this id: ${id}`, 404));

	res.json({
		status: 'success',
		message: 'Document found.',
		result: doc
	});
});

exports.addAstrologerOffer = catchAsync(async (req, res, next) => {
	const data = req.body;

	const doc = await AstrologerOffers.create(data);

	res.json({
		status: 'success',
		message: 'Document added successfully.',
		result: doc
	});
});

exports.updateAstrologerOffer = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const data = req.body;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	if (_.isEmpty(data)) return next(new AppError('Invalid request.', 406));

	const doc = await AstrologerOffers.findByIdAndUpdate(id, data, { new: true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document updated successfully.',
		result: doc
	});
});

exports.deleteAstrologerOffer = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

	const doc = await AstrologerOffers.findByIdAndUpdate(id, { 'deleted.trash': true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'Document deleted successfully.',
		result: doc
	});
});