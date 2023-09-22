const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const Filter = require('../models/filter.model');

exports.getFilters = catchAsync(async (req, res, _next) => {
    const { type } = req.query;

    const find = {};
    if (type) find.type = { $in: type.split(',') };

    const filter = await Filter.aggregate([
        { $match: find },
        { $group: { _id: "$type", title: { "$first": "$type" }, type: { $push: { name: '$name', _id: '$_id', icon: '$icon' } } } }
    ]);

    res.json({
        status: 'success',
        message: 'Documents found.',
        result: filter
    });
});

exports.getFilterById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const queryFields = req.query.fields;

    if (!id) return next(new AppError('No id specified to query.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    let fields;
    if (queryFields) fields = queryFields.split(',').join(' ');


    const filter = await Filter.findById(id, fields);
    if (!filter) return next(new AppError(`No document with this id: ${id}`, 404));

    res.json({
        status: 'success',
        message: 'Document found.',
        result: filter
    });
});

exports.getFilterByType = catchAsync(async (req, res, next) => {
    const { type } = req.params;
    if (!type) return next(new AppError('No type specified to query.', 400));

    const docs = await Filter.aggregate([
        { $match: { type } },
        { $group: { _id: "$type", title: { "$first": "$type" }, type: { $push: { name: '$name', _id: '$_id', icon: '$icon' } } } }
    ]);

    res.json({
        status: 'success',
        message: 'Documents fetched successfully.',
        result: docs[0]
    });

});

exports.createFilter = catchAsync(async (req, res, next) => {
    const data = req.body;

    const filter = await Filter.create(data);

    res.json({
        status: 'success',
        message: 'Document added successfully.',
        result: filter
    });
});

exports.updateFilter = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const data = req.body;

    if (!id) return next(new AppError('No id was provided.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));
    if (_.isEmpty(data)) return next(new AppError('Invalid data. Empty request', 400));

    const filter = await Filter.findByIdAndUpdate(id, data, { new: true });
    if (!filter) return next(new AppError('No document found with this id.', 404));

    res.json({
        status: 'success',
        message: 'Document updated successfully.',
        result: filter
    });
});

exports.deleteFilter = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id) return next(new AppError('No id was provided.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    const filter = await Filter.findByIdAndDelete(id);
    if (!filter) return next(new AppError('No document found with this id.', 404));

    res.json({
        status: 'success',
        message: 'Document updated successfully.',
        result: filter
    });
});