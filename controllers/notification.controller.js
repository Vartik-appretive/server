const _ = require('lodash');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Notification = require('../models/notification.model');
const validateID = require('../utils/validateId');
const User = require('../models/users.model');
const Helper = require('../utils/helper');
const ScheduledNotification = require('../models/scheduledNotification.model');

const messaging = Helper.getFirbaseMessaging;

exports.sendNotification = catchAsync(async (req, res, next) => {
	const { title, description, image } = req.body;

	const doc = await Notification.create({ title, description, image });

	const users = await User.find({ 'deleted.trash': false }).select('deviceToken');
	if (users.length === 0) return next(new AppError("No active users were found", 404));

	let tokens = [];
	users?.forEach(data => {
		if (data.deviceToken && data.deviceToken != "") tokens.push(data.deviceToken);
	});

	if (tokens.length === 0) return next(new AppError("No active users were found", 404));

	tokens = [...new Set(tokens)];

	const notifyMulti = {
		tokens,
		notification: {
			title: doc.title,
			body: doc.description
		},
		data: {
			click_action: 'SIMPLE_NOTIFICATION',
			icon: doc.image || ""
		}
	};

	try {
		// const firebseResponse = await messaging.sendMulticast(notifyMulti);
		// console.log(firebseResponse.responses);
		await messaging.sendMulticast(notifyMulti);
	} catch (err) {
		return next(new AppError(err.message || "Unknow error occur.", 500));
	}

	res.json({
		status: 'success',
		message: `Total ${tokens.length} notification were sent.`
	});

	// const failedTokens = [];
	// if (firebseResponse.failureCount > 0) {
	// 	firebseResponse.responses.forEach((resp, index) => {
	// 		if (!resp.success) {
	// 			failedTokens.push(users[index]?._id);
	// 		}
	// 	});
	// }

	// if (failedTokens.length > 0) {
	// 	try {
	// 		await User.updateMany({ _id: { $in: failedTokens } }, { isLegitDevice: false });
	// 	} catch (error) {
	// 		console.log("Notification Send Error");
	// 		console.log(error.message);
	// 	}
	// }
});

exports.getNotifications = catchAsync(async (req, res, next) => {
	const find = {};

	let fields;
	if (req.query.fields) fields = queryFields.split(',').join(' ');
	if (req.query.role) find.role = req.query.role;

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocuments = await Notification.countDocuments(find);
	const docs = await Notification.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: 'Data fetched successfully.',
		totalPages,
		result: docs
	});
});

exports.subscribeToAstrologer = catchAsync(async (req, res, next) => {
	const { astrologerId } = req.query;

	if (!validateID(astrologerId)) return next(new AppError("Not a valid astrologer id", 400));

	const doc = await ScheduledNotification.findOneAndUpdate({ user: req.user._id, astrologer: astrologerId }, { user: req.user._id, astrologer: astrologerId }, { upsert: true, new: true });

	res.json({
		status: "success",
		message: "Successfully Subscribe to astrologer",
		result: doc
	});
});

exports.unsubscribeToAstrologer = catchAsync(async (req, res, next) => {
	const { astrologerId } = req.query;

	if (!validateID(astrologerId)) return next(new AppError("Not a valid astrologer id", 400));

	await ScheduledNotification.findOneAndDelete({ user: req.user._id, astrologer: astrologerId });

	res.json({
		status: "success",
		message: "Successfully Unsubscribe to astrologer",
		result: null
	});
});