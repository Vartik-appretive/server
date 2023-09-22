const _ = require("lodash");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const validateID = require("../utils/validateId");
const Blog = require("../models/blog.model");

exports.getBlogs = catchAsync(async (req, res, next) => {
    const find = {};
    let fields;
    const queryFields = req.query.fields;
    if (queryFields) fields = queryFields.split(",").join(" ");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = parseInt(req.query.sort) || -1;
    const skip = (page - 1) * limit;

    const docs = await Blog.countDocuments(find);
    const blog = await Blog.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
    const totalPages = Math.ceil(docs / limit);

    res.json({
        status: "success",
        message: "Documents fetched successfully.",
        totalPages,
        result: blog,
    });
});

exports.getBlogById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const queryFields = req.query.fields;

    if (!id) return next(new AppError("No id specified to query.", 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    let fields;
    if (queryFields) fields = queryFields.split(",").join(" ");

    const blog = await Blog.findById(id, fields);
    if (!blog) return next(new AppError(`No document with this id: ${id}`, 404));

    res.json({
        status: "success",
        message: "Document found.",
        result: blog,
    });
});

exports.addBlog = catchAsync(async (req, res, next) => {
    const data = req.body;
    const { title, featuredImage, description } = data;

    if (!title) return next(new AppError("title is required.", 400));
    if (!featuredImage) return next(new AppError("Featured Image is required.", 400));
    if (!description) return next(new AppError("Description is required.", 400));

    const blog = await Blog.create(data);

    res.json({
        status: "success",
        message: "Document added successfully.",
        result: blog,
    });
});

exports.updateBlog = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const data = req.body;

    if (!id) return next(new AppError("No id was provided.", 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    if (_.isEmpty(data)) return next(new AppError("Invalid request.", 406));

    const blog = await Blog.findByIdAndUpdate(id, data, { new: true });
    if (!blog) return next(new AppError("No document found with this id.", 404));

    res.json({
        status: "success",
        message: "Document updated successfully.",
        result: blog,
    });
});

exports.deleteBlog = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id) return next(new AppError("No id was provided.", 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) return next(new AppError("No document found with this id.", 404));

    res.json({
        status: "success",
        message: "Document deleted successfully.",
        result: blog,
    });
});
