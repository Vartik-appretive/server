const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validateID = require('../utils/validateId');
const Pooja = require('../models/pooja.model');
const PoojaOrders = require('../models/poojaOrders.model');
const Transaction = require('../models/transactions.model');
const Wallet = require('../models/wallet.model');
const constants = require('../config/constants');
const formatDate = require('../utils/formatDate');
const PoojaSlots = require('../models/poojaSlots.model');
const uniqueId = require('../utils/uniqueId');

exports.getPooja = catchAsync(async (req, res, next) => {
	let find = {};
	if (req.query.duration) find.duration = req.query.duration;

	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocuments = await Pooja.countDocuments(find);
	const pooja = await Pooja.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
	const totalPages = Math.ceil(totalDocuments / limit);

	// if (page > totalPages) return next(new AppError('Page does not exists.', 404));
	// if (pooja.length < 1) return next(new AppError('No photos were found.', 404));

	res.json({
		status: 'success',
		message: `${totalDocuments} documents found.`,
		totalPages,
		result: pooja
	});
});

exports.getPoojaById = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new AppError('Provide id of document to update', 400));
	if (!validateID(id)) return next(new AppError('Invalid id please proveide id.', 400));

	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');

	const pooja = await Pooja.findById(id, fields);

	res.json({
		status: 'success',
		message: `documents found.`,
		result: pooja
	});
});

exports.searchPooja = catchAsync(async (req, res, next) => {
	const { name } = req.query;

	if (!name) return next(new AppError('Provide name of document to search', 400));

	// let fields;
	// if (req.query.fields) fields = req.query.fields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const docs = await Pooja.find({ $text: { $search: name } }).skip(skip).limit(limit).select('title featuredImage color').sort({ _id: sort });

	res.json({
		status: 'success',
		message: `${docs.length} documents found.`,
		result: docs
	});
});

exports.addPooja = catchAsync(async (req, res, next) => {
	const data = req.body
	if (_.isEmpty(data)) return next(new AppError("Empty request. Provide data to insert", 400));

	const pooja = await Pooja.create(data);

	res.json({
		status: 'success',
		message: 'Pooja created successfully.',
		result: pooja
	});
});

exports.updatePooja = catchAsync(async (req, res, next) => {
	const data = req.body;
	const { id } = req.params;

	if (_.isEmpty(data)) return next(new AppError("Empty request. Provide data to update", 400));
	if (!id) return next(new AppError('Provide id of document to update', 400));
	if (!validateID(id)) return next(new AppError('Invalid id please proveide id.', 400));

	const pooja = await Pooja.findByIdAndUpdate(id, data, { new: true, runValidators: true });
	if (!pooja) return next(new AppError(`No pooja found with id: ${id}`, 404));

	res.json({
		status: 'success',
		message: 'pooja updated successfully.',
		result: pooja
	});
});

exports.deletePooja = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!id) return next(new AppError('Provide id of document to update', 400));
	if (!validateID(id)) return next(new AppError('Invalid id please proveide id.', 400));

	const pooja = await Pooja.findByIdAndDelete(id);
	if (!pooja) return next(new AppError(`No pooja found with id: ${id}`, 404));

	res.json({
		status: 'success',
		message: 'pooja updated successfully.',
		result: null
	});
});

exports.bookPooja = catchAsync(async (req, res, next) => {
	let data = req.body;
	const user = req.user;

	const wallet = await Wallet.findOne({ user: user._id }, 'balance');

	const { plan: planKey, pooja: poojaId, poojaSlot, slotId } = data;

	if (!poojaId) return next(new AppError("Pooja id is required", 400));
	if (!validateID(poojaId)) return next(new AppError("Not valid Pooja id.", 400));
	if (!planKey) return next(new AppError("Pooja plan is required", 400));
	if (!poojaSlot) return next(new AppError("Pooja Slot is required", 400));
	if (!validateID(poojaSlot)) return next(new AppError("Not valid pooja slot.", 400));
	if (!slotId) return next(new AppError("Slot Id is required", 400));
	if (!validateID(slotId)) return next(new AppError("Not valid slot id.", 400));

	const slot = await PoojaSlots.findOne({ _id: poojaSlot, 'slots._id': slotId });
	if (!slot) return next(new AppError("No slot found for this id", 404));

	const bookSlot = slot.slots.find(s => s._id.toString() === slotId);
	if (bookSlot.booked) return next(new AppError("This slot is already booked.", 403));

	const pooja = await Pooja.findById(poojaId, 'plans');
	if (!pooja) return next(new AppError("No pooja found for this id", 404));

	const plan = pooja.plans.find(plan => plan.key === planKey);
	if (!plan) return next(new AppError("No plan found for this id", 404));

	if (wallet.balance < plan.price) return next(new AppError("Not enough balance for this plan", 406));

	// const transaction = await Transaction.create({ status: constants.success, uoid: `TEMP_${uuidv4()}`, amount: plan.price, type: 'withdraw', orderId: uuidv4(), txnId: uuidv4(), bankTxnId: uuidv4(), tnxTimestamp: +new Date(), ref: 'pooja', user: user._id, mobile: user.mobile, other: { txnDate: formatDate(+new Date(), 'yyyy-mm-dd hh:mm:ss') } });
	const transaction = await Transaction.create({ status: constants.success, amount: plan.price, type: 'withdraw', orderId: uniqueId("numeric"), tnxTimestamp: +new Date(), ref: 'pooja', user: user._id, mobile: user.mobile, other: { txnDate: formatDate(+new Date(), 'yyyy-mm-dd hh:mm:ss') } });
	// const transaction = await Transaction.create({ status: constants.success, uoid: `TEMP_${uniqueId()}`, amount: plan.price, type: 'withdraw', orderId: uniqueId("numeric"), tnxTimestamp: +new Date(), ref: 'pooja', user: user._id, mobile: user.mobile, other: { txnDate: formatDate(+new Date(), 'yyyy-mm-dd hh:mm:ss') } });

	data = { ...data, user: user._id, transaction: transaction._id, price: plan.price, date: slot.date, poojaSlot: slot._id, slot: bookSlot._id };
	// data.user = user._id;
	// data.transaction = transaction._id;
	// data.price = plan.price;
	// data.date = slot.date;
	// data.poojaSlot = slot._id;
	// data.slot = bookSlot._id;

	data.status = 'pending';
	const doc = await PoojaOrders.create(data);

	await Wallet.findByIdAndUpdate(wallet._id, { balance: wallet.balance - plan.price });
	await PoojaSlots.findOneAndUpdate({ _id: slot._id, 'slots._id': bookSlot._id }, { 'slots.$.booked': true, 'slots.$.user': user._id });

	res.json({
		status: 'success',
		message: 'Pooja booked successfully.',
		result: doc
	});

	await Transaction.findByIdAndUpdate(transaction._id, { pooja: doc._id });
	// await Transaction.findByIdAndUpdate(transaction._id, { pooja: doc._id, uoid: `${user._id.toString()}-${doc._id.toString()}` });
});

exports.getPoojaOrders = catchAsync(async (req, res, next) => {
	let find = {};

	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocuments = await PoojaOrders.countDocuments(find);
	const docs = await PoojaOrders.find(find).populate([{ path: 'poojaSlot' }, { path: 'pooja', select: 'title featuredImage' }, { path: 'user', select: 'name mobile email profilePhoto' }]).skip(skip).limit(limit).select(fields).sort({ _id: sort });
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: `pooja order fetched successfully.`,
		totalPages,
		result: docs
	});
});

exports.getUserBookedPooja = catchAsync(async (req, res, next) => {
	const user = req.user;
	let find = { user: user._id };

	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocuments = await PoojaOrders.countDocuments(find);
	const docs = await PoojaOrders.find(find).populate([{ path: 'poojaSlot' }, { path: 'pooja', select: 'title featuredImage' }]).skip(skip).limit(limit).select(fields).sort({ _id: sort });
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: `pooja order fetched successfully.`,
		totalPages,
		result: docs
	});
});

exports.getBookedPoojaById = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	if (!user) return next(new AppError("user id is required", 400));

	let find = { user: id };

	let fields;
	const queryFields = req.query.fields;
	if (queryFields) fields = queryFields.split(',').join(' ');

	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const sort = parseInt(req.query.sort) || -1;
	const skip = (page - 1) * limit;

	const totalDocuments = await PoojaOrders.countDocuments(find);
	const docs = await PoojaOrders.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
	const totalPages = Math.ceil(totalDocuments / limit);

	res.json({
		status: 'success',
		message: `pooja order fetched successfully.`,
		totalPages,
		result: docs
	});
});

exports.updatePoojaOrderById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const data = req.body;

	const doc = await PoojaOrders.findByIdAndUpdate(id, data);
	if (!doc) return next(new AppError("No pooja with this id", 404));

	res.json({
		status: 'success',
		message: 'pooja order updated successfully'
	});
});