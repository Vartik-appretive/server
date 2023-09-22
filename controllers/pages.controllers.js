const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Page = require('../models/pages.model');
const validateID = require('../utils/validateId');

exports.getPageByName = catchAsync(async (req, res, next) => {
    const { screen } = req.params;
    if (!screen) return next(new AppError('Screen name is required', 400));

    let fields = req.query.fields;
    if (fields) fields = fields.split(',').join(' ');

    const page = await Page.findOne({ screen }, fields);
    if (!page) return next(new AppError(`No screen with name: ${screen}`, 404));

    res.json({
        status: 'success',
        message: 'Documents found.',
        result: page
    });
});

exports.getPage = catchAsync(async (req, res, next) => {
    const { screen } = req.params;
    const { type, field } = req.query;

    if (!screen) return next(new AppError('Screen Name is required', 400));
    if (!type) return next(new AppError('Type is required', 400));
    if (!field) return next(new AppError('Field is required', 400));

    let value = [];
    if (type.toLowerCase() === 'object') value = {};
    if (type.toLowerCase() === 'string') value = '';

    let page = await Page.findOne({ screen });
    if (!page) page = await Page.findOneAndUpdate({ screen }, { screen, data: { [field]: value } }, { upsert: true, new: true });

    res.json({
        status: 'success',
        message: 'Documents found.',
        result: page
    });
});

exports.addPage = catchAsync(async (req, res, next) => {
    const data = req.body;

    if (!data.screen) return next(new AppError("Screen name is required", 400));
    data.screen = _.kebabCase(data.screen);

    const page = await Page.create(data);

    res.json({
        status: 'success',
        message: 'Documents added successfully.',
        result: page
    });
});

exports.updatePage = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const data = req.body;

    if (!id) return next(new AppError('No id specified to query.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));
    if (_.isEmpty(data)) return next(new AppError("Enter detais to update", 406));

    const page = await Page.findByIdAndUpdate(id, data, { new: true, runValidators: true, upsert: true });
    if (!page) return next(new AppError(`No screen found with id: ${id}`, 404));

    res.json({
        status: 'success',
        message: 'Dodument updated successfully.',
        result: page
    });
});

exports.deletePage = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id) return next(new AppError('No id specified to query.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    const page = await Page.findByIdAndDelete(id);
    if (!page) return next(new AppError(`No screen found with id: ${id}`, 404));

    res.json({
        status: 'success',
        message: 'Dodument deleted successfully.',
        result: page
    });
});

exports.renderPage = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const doc = await Page.findOne({ screen: id });

    res.render('template', { 
        title: 'test', 
        data: doc.data.content 
    });
});