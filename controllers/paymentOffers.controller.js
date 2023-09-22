const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const PaymentOffers = require('../models/paymentOffers.model');

exports.getPaymentOffers = catchAsync(async (req, res, _next) => {
	const { role } = req.user;
	const find = {};
	find.status = role === "administrator" ? { $ne: 'trash' } : "live";

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 20;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	let fields;
	if (req.query.fields) fields = queryFields.split(',').join(' ');
	if (req.query.role) find.role = req.query.role;

	const totalDocuments = await PaymentOffers.countDocuments(find);
	const docs = await PaymentOffers.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: 'payment offers fetched successfully',
		totalPages,
		result: docs
	});
});

exports.addPaymentOffers = catchAsync(async (req, res, _next) => {
	const data = req.body;

	const doc = await PaymentOffers.create(data);

	res.json({
		status: 'success',
		message: 'payment offers created',
		result: doc
	});
});

exports.updatePaymentOffers = catchAsync(async (req, res, next) => {
	const id = req.params.id;
	const data = req.body;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError('Invalid id was provided.', 400));

	const doc = await PaymentOffers.findByIdAndUpdate(id, data, { new: true });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'payment offers updated',
		result: doc
	});
});

exports.deletePaymentOffers = catchAsync(async (req, res, next) => {
	const id = req.params.id;

	if (!id) return next(new AppError('No id was provided.', 400));
	if (!validateID(id)) return next(new AppError('Invalid id was provided.', 400));

	const doc = await PaymentOffers.findByIdAndUpdate(id, { status: 'trash' });
	if (!doc) return next(new AppError('No document found with this id.', 404));

	res.json({
		status: 'success',
		message: 'payment offers deleted',
		result: doc
	});
});