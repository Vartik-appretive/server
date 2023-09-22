const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const AstroAdminCommunication = require('../models/astroAdminCommunication.model');

exports.getAstroAdminCommunications = catchAsync(async (req, res, next) => {
    const find = {};
    let fields;
    const queryFields = req.query.fields;
    if (queryFields) fields = queryFields.split(',').join(' ');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = parseInt(req.query.sort) || -1;
    const skip = (page - 1) * limit;

    const docsCount = await AstroAdminCommunication.countDocuments(find);
    const docs = await AstroAdminCommunication.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
    const totalPages = Math.ceil(docsCount / limit);

    res.json({
        status: 'success',
        message: 'Documents found.',
        totalPages,
        result: docs
    });
});

exports.getAstroAdminCommunicationById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const queryFields = req.query.fields;

    if (!id) return next(new AppError('No id specified to query.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    let fields;
    if (queryFields) fields = queryFields.split(',').join(' ');

	
    const doc = await AstroAdminCommunication.findById(id, fields);
    if (!doc) return next(new AppError(`No document with this id: ${id}`, 404));

    res.json({
        status: 'success',
        message: 'Document found.',
        result: doc
    });
});

exports.addAstroAdminCommunication = catchAsync(async (req, res, next) => {
    const data = req.body;
    const { title, message } = data;

    if(!title) return next(new AppError('Title is required.', 400));
    if(!message) return next(new AppError('Message is required.', 400));

    const doc = await AstroAdminCommunication.create(data);

    res.json({
        status: 'success',
        message: 'Document added successfully.',
        result: doc
    });
});

exports.updateAstroAdminCommunication = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const data = req.body;

    if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    if(_.isEmpty(data)) return next(new AppError('Invalid request.', 406));

    const doc = await AstroAdminCommunication.findByIdAndUpdate(id, data, { new: true });
    if (!doc) return next(new AppError('No document found with this id.', 404));

    res.json({
        status: 'success',
        message: 'Document updated successfully.',
        result: doc
    });
});

exports.deleteAstroAdminCommunication = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id) return next(new AppError('No id was provided.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    const doc = await AstroAdminCommunication.findByIdAndDelete(id);
    if (!doc) return next(new AppError('No document found with this id.', 404));

    res.json({
        status: 'success',
        message: 'Document deleted successfully.',
        result: doc
    });
});