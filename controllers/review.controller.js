const _ = require('lodash');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Review = require('../models/review.model');
const validateID = require('../utils/validateId');
const VideoSDKMeeting = require('../models/meeting.model');
const User = require('../models/users.model');

exports.getDocs = catchAsync(async (req, res, next) => {
    const { astrologer } = req.query;
    if (!astrologer) return next(new AppError("Astrologer ID is required", 400));

    const find = { astrologer };

    let fields;
    const queryFields = req.query.fields;
    if (queryFields) fields = queryFields.split(',').join(' ');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = parseInt(req.query.sort) || -1;
    const skip = (page - 1) * limit;

    const totalDocuments = await Review.countDocuments(find);
    const docs = await Review.find(find).populate([{ path: 'user', select: 'name profilePhoto' }]).skip(skip).limit(limit).select(fields).sort({ _id: sort });
    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
        status: 'success',
        message: 'Documents fetched successfully.',
        totalPages,
        result: docs
    });
});

exports.addDoc = catchAsync(async (req, res, next) => {
    const user = req.user;
    const data = req.body;

    const doc = await VideoSDKMeeting.findOneAndUpdate({ 'call.customRoomId': data.meeting }, { rating: data.rating });
    if (!doc) return next(new AppError("No meeting with this custom room Id", 400));

    data.user = user._id;
    data.meeting = doc._id;
    data.umid = `${user._id}${doc._id.toString()}`;

    await Review.create(data);

    res.json({
        status: 'success',
        message: 'Documents added successfully.'
    });

    const { value, counts } = user.rating;
    const rating = {
        value: (value + Number(data.rating)) / (counts + 1),
        counts: counts + 1
    };
    await User.findByIdAndUpdate(data.astrologer, { rating });
});

exports.updateDoc = catchAsync(async (req, res, next) => {
    const user = req.user;
    const { id } = req.params;
    const data = req.body;

    if (!id) return next(new AppError('No id specified to query.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));
    if (_.isEmpty(data)) return next(new AppError("Enter detais to update", 406));

    // const doc = await Review.findOneAndUpdate({ _id: id, $or: [{ astrologer: user._id }, { user: user._id }] }, data, { new: true, runValidators: true });
    const doc = await Review.findOneAndUpdate({ _id: id }, data, { new: true, runValidators: true });
    if (!doc) return next(new AppError(`No document found with id: ${id}`, 404));

    res.json({
        status: 'success',
        message: 'Dodument updated successfully.',
        result: doc
    });
});

exports.deleteDoc = catchAsync(async (req, res, next) => {
    const user = req.user;
    const { id } = req.params;

    if (!id) return next(new AppError('No id specified to query.', 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    const doc = await Review.findOneAndDelete({ _id: id, astrologer: user._id });
    if (!doc) return next(new AppError(`No Doc found with id: ${id}`, 404));

    res.json({
        status: 'success',
        message: 'Dodument deleted successfully.',
        result: null
    });
});