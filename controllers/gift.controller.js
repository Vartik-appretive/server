const _ = require("lodash");
// const { v4 } = require('uuid');
const uniqueId = require("../utils/uniqueId");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const validateID = require("../utils/validateId");
const Gift = require("../models/gifts.model");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transactions.model");
const constants = require("../config/constants");
const User = require("../models/users.model");
const formatDate = require("../utils/formatDate");

// const uuidv4 = v4;

exports.getGifts = catchAsync(async (req, res, next) => {
    const find = { "deleted.trash": false };
    // let fields;
    // const queryFields = req.query.fields;
    // if (queryFields) fields = queryFields.split(',').join(' ');

    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 10;
    const sort = parseInt(req.query.sort) || 1;
    // const skip = (page - 1) * limit;

    // const totalDocs = await Gift.countDocuments(find);
    const docs = await Gift.find(find).sort({ price: sort });
    // const totalPages = Math.ceil(totalDocs / limit);

    res.json({
        status: "success",
        message: "Documents fetched.",
        result: docs,
    });
});

exports.getGiftById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const queryFields = req.query.fields;

    if (!id) return next(new AppError("No id specified to query.", 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    let fields;
    if (queryFields) fields = queryFields.split(",").join(" ");

    const doc = await Gift.findById(id, fields);
    if (!doc) return next(new AppError(`No document with this id: ${id}`, 404));

    res.json({
        status: "success",
        message: "Document found.",
        result: doc,
    });
});

exports.addGift = catchAsync(async (req, res, next) => {
    const data = req.body;

    const doc = await Gift.create(data);

    res.json({
        status: "success",
        message: "Document added successfully.",
        result: doc,
    });
});

exports.updateGift = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const data = req.body;

    if (!id) return next(new AppError("No id was provided.", 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    if (_.isEmpty(data)) return next(new AppError("Invalid request.", 406));

    const doc = await Gift.findByIdAndUpdate(id, data, { new: true });
    if (!doc) return next(new AppError("No document found with this id.", 404));

    res.json({
        status: "success",
        message: "Document updated successfully.",
        result: doc,
    });
});

exports.deleteGift = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id) return next(new AppError("No id was provided.", 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    const doc = await Gift.findByIdAndUpdate(id, { "deleted.trash": true });
    if (!doc) return next(new AppError("No document found with this id.", 404));

    res.json({
        status: "success",
        message: "Document deleted successfully.",
        result: null,
    });
});

exports.sendGift = catchAsync(async (req, res, next) => {
    const user = req.user;
    const { astrologer, gift, liveStreamId } = req.body;

    if (!astrologer) return next(new AppError("Astrologer id is required", 400));
    if (!gift) return next(new AppError("Gift id is required", 400));

    if (!validateID(astrologer)) return next(new AppError(`Not valid astrologer id: ${astrologer}`, 400));
    if (!validateID(gift)) return next(new AppError(`Not valid gift id: ${gift}`, 400));

    const astrologerDetails = await User.findById(astrologer, "mobile plateformCharges");
    if (!astrologerDetails) return next(new AppError("No astrologer found with this name", 404));

    const astrologerMobile = astrologerDetails.mobile;

    const wallet = await Wallet.findOne({ user: user._id });

    const giftDetails = await Gift.findById(gift);
    if (giftDetails.price > wallet.balance) return next(new AppError("You do not have enough balance.", 402));

    const txnDate = formatDate(+new Date(), "yyyy-mm-dd hh:mm:ss");

    const amount = giftDetails.price;

    const plateformCharge = (amount * (astrologerDetails.plateformCharges || 0) || 0) / 100;
    const astrologerAmount = amount - plateformCharge;

    const transactionsData = [
        {
            status: constants.success,
            // uoid: `gift-${uniqueId()}`,
            amount,
            type: "withdraw",
            orderId: uniqueId("numeric"),
            livestream: liveStreamId,
            // txnId: uniqueId(),
            // bankTxnId: uniqueId(),
            tnxTimestamp: +new Date(),
            ref: constants.gift.key,
            user: user._id,
            fromUser: user._id,
            toUser: astrologer,
            mobile: user.mobile,
            other: {
                txnDate,
            },
        },
        {
            status: constants.success,
            // uoid: `gift-${uniqueId()}`,
            amount: astrologerAmount,
            plateformCharges: plateformCharge,
            type: "deposit",
            orderId: uniqueId("numeric"),
            livestream: liveStreamId,
            // txnId: uniqueId(),
            // bankTxnId: uniqueId(),
            tnxTimestamp: +new Date(),
            ref: constants.gift.key,
            user: astrologer,
            fromUser: user._id,
            toUser: astrologer,
            mobile: astrologerMobile,
            other: {
                txnDate,
            },
        },
    ];

    await Transaction.insertMany(transactionsData);

    res.json({
        status: "success",
        message: "Gift sent successfully.",
    });
});
