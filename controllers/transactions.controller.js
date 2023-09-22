const PaytmChecksum = require("paytmchecksum");
const axios = require("axios");
const { v4: uuidv4, validate: uuidValidate } = require("uuid");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Transaction = require("../models/transactions.model");
// const validateID = require('../utils/validateId');
const Wallet = require("../models/wallet.model");
// const VideoSDKMeeting = require('../models/meeting.model');
const config = require("../config/config");
const constants = require("../config/constants");
const validateID = require("../utils/validateId");
const PaymentOffer = require("../models/paymentOffers.model");
const formatDate = require("../utils/formatDate");
const User = require("../models/users.model");
const uniqueId = require("../utils/uniqueId");

const PAYTMBASEURL = config.paytmApiBaseUrl;
const MID = process.env.PAYTM_MERCHENT_ID;
const MKEY = process.env.PAYTM_MERCHENT_KEY;

exports.depositeTransactions = catchAsync(async (req, res, next) => {
    try {
        const user = req.user;
        const { amount, type, ref, orderId: oId, offer } = req.body;

        if (!oId) return next(new AppError("OrderId is required", 400));
        if (!uuidValidate(oId)) return next(new AppError("OrderId is not valid", 400));
        if (!amount || !type) return next(new AppError("Invalid input provided", 400));
        if (type !== "deposit") return next(new AppError("Invalid input provided", 400));
        if (offer && !validateID(offer)) return next(new AppError("Invalid input provided", 400));

        const preValidateOrderId = await Transaction.findOne({ orderId: oId }, "user");
        if (preValidateOrderId || preValidateOrderId?._id) return next(new AppError("Transaction already exists", 403));

        const paytmPostBody = {};
        paytmPostBody.body = {
            mid: MID,
            orderId: oId,
        };

        const paytmChecksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmPostBody.body), MKEY);
        paytmPostBody.head = { signature: paytmChecksum };

        //TXN_SUCCESS, TXN_FAILURE, PENDING, NO_RECORD_FOUND
        const { data } = await axios.post(`${PAYTMBASEURL}/v3/order/status`, paytmPostBody);

        if (data.body.resultInfo.resultStatus !== constants.success) {
            return res.json({
                status: "fail",
                message: "Something went wrong",
                result: data.body.resultInfo,
            });
        }

        const { resultInfo, txnId, bankTxnId, orderId, txnAmount, ...other } = data.body;
        other.resultCode = resultInfo.resultCode;
        other.resultMsg = resultInfo.resultMsg;

        const tnxTimestamp = +new Date();

        const doc = await Transaction.create({ status: resultInfo.resultStatus, amount: Number(txnAmount), type, user: user._id, tnxTimestamp, mobile: user.mobile, txnId, bankTxnId, orderId, ref, offer, other });
        // const doc = await Transaction.create({ status: resultInfo.resultStatus, amount: Number(txnAmount), type, user: user._id, uoid: uniqueId("default"), tnxTimestamp, mobile: user.mobile, txnId, bankTxnId, orderId, ref, offer, other });

        res.json({
            status: "success",
            message: "transaction created successfully",
            result: doc,
        });

        const offerDetails = await PaymentOffer.findById(offer);
        if (offerDetails) {
            const txnDate = formatDate(+new Date(), "yyyy-mm-dd hh:mm:ss");

            if (Number(offerDetails.payingAmount) === Number(txnAmount)) {
                const amount = Number(offerDetails.offerAmount) - Number(txnAmount);
                await Transaction.create({
                    status: constants.success,
                    amount: Number(amount),
                    type: "deposit",
                    user: user._id,
                    tnxTimestamp: +new Date(),
                    mobile: user.mobile,
                    orderId: uniqueId("numeric"),
                    ref: "offer",
                    offer,
                    other: { txnDate },
                });
                // await Transaction.create({
                // 	status: constants.success, amount: Number(amount),
                // 	type: 'deposit', user: user._id, uoid: uniqueId(), tnxTimestamp: +new Date(), mobile: user.mobile,
                // 	orderId: uniqueId("numeric"), ref: 'offer', offer, other: { txnDate }
                // });

                const wallet = await Wallet.findOne({ user: user._id });
                let walletAmount = wallet.balance + Number(offerDetails.offerAmount);
                return await Wallet.findByIdAndUpdate(wallet._id, { balance: walletAmount });
            }
        }

        const wallet = await Wallet.findOne({ user: user._id });
        let walletAmount = wallet.balance + Number(txnAmount);
        await Wallet.findByIdAndUpdate(wallet._id, { balance: walletAmount });
    } catch (err) {
        if (err.response) {
            return next(new AppError(err?.response?.message || err?.message || "Unknow error occur. Please try again.", err?.response?.status || 500));
        }

        next(new AppError(err.message, 500));
    }
});

exports.withdrawTransaction = catchAsync(async (req, res, next) => {
    return next(new AppError("Not valid url", 404));
    const user = req.user;
    let { amount, type } = req.body;

    if (!user._id) return next(new AppError("Not authorised", 401));
    if (!amount || !type) return next(new AppError("Invalid input provided", 400));
    if (type !== "withdraw") return next(new AppError("Invalid input provided", 400));

    const wallet = await Wallet.findOne({ user: user._id });
    if (wallet.balance < amount) return next(new AppError("Insufficient wallet balance", 402));

    const doc = await Transaction.create({ status: constants.success, amount: Number(amount), uoid: uniqueId(), type, user: user._id, mobile: user.mobile });

    res.json({
        status: "success",
        message: "transaction created successfully",
        result: doc,
    });

    let walletAmount = wallet.balance - Number(amount);
    await Wallet.findByIdAndUpdate(wallet._id, { balance: walletAmount });
});

exports.generatePaytmTransactionToken = catchAsync(async (req, res, next) => {
    try {
        const user = req.user;
        const { amount, currency } = req.body;
        if (!amount) throw new AppError("amount is required", 400);

        // const meeting = await VideoSDKMeeting.findById(id, 'user.id');
        // if(!meeting) return next(new AppError("No meeting found with this id", 404));

        const orderId = uniqueId("numeric");

        // "callbackUrl": "https://<callback URL to be used by merchant>",
        const paytmPostBody = {};
        paytmPostBody.body = {
            requestType: "Payment",
            mid: MID,
            orderId: orderId,
            websiteName: "WEBSTAGING",
            callbackUrl: `${PAYTMBASEURL}/theia/paytmCallback?ORDER_ID=${orderId}`,
            txnAmount: {
                value: Number(amount).toFixed(2),
                currency: currency || "INR",
            },
            userInfo: {
                custId: user._id.toString(),
            },
        };

        const paytmChecksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmPostBody.body), MKEY);
        paytmPostBody.head = { signature: paytmChecksum, channelId: "WAP" };

        console.log(paytmChecksum);

        const { data } = await axios.post(`${PAYTMBASEURL}/theia/api/v1/initiateTransaction?mid=${MID}&orderId=${orderId}`, paytmPostBody);
        console.log(data.body);
        console.log(data?.body?.resultInfo);

        if (data?.body?.resultInfo?.resultStatus !== "S") throw new AppError("Unknow error occur", 500);

        const result = {
            txnToken: data.body.txnToken,
            orderId,
            mid: MID,
            amount: paytmPostBody?.body?.txnAmount?.value,
        };

        res.json({
            status: "success",
            message: "token created successfully",
            result,
        });
    } catch (err) {
        if (err.response) {
            return next(new AppError(err?.response?.message || err.message || "Unknow error occur. Please try again.", err?.response?.status || 500));
        }

        next(new AppError(err.message, 500));
    }
});

exports.getTrasactionHistory = catchAsync(async (req, res, next) => {
    const user = req.user;

    const find = { user: user._id };

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    const select = req.query.select === "all" ? "" : req.query.select?.split(",").join(" ") || "status amount currency orderId txnId type ref other.txnDate createdAt";

    const totalDocuments = await Transaction.countDocuments(find);
    const docs = await Transaction.find(find).skip(skip).limit(limit).select(select).sort({ _id: -1 });
    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
        status: "success",
        message: "transaction history fetched successfully",
        totalPages,
        result: docs,
    });
});

exports.getTrasactionHistoryByUserId = catchAsync(async (req, res, next) => {
    if (!req.params.id) return next(new AppError("user id is required", 400));

    const find = { user: req.params.id };

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    const select = req.query.select === "all" ? "" : req.query.select?.split(",").join(" ") || "status amount currency orderId txnTd type ref";
    const sort = req.query.sort ? req.query.sort : -1;

    const totalDocuments = await Transaction.countDocuments(find);
    const docs = await Transaction.find(find).skip(skip).limit(limit).select(select).sort({ _id: sort });
    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
        status: "success",
        message: "transaction history fetched successfully",
        totalPages,
        result: docs,
    });
});

exports.generateReport = catchAsync(async (req, res, next) => {
    const { from, to } = req.query;

    if (!from) return next(new AppError("from date must be specified", 400));
    if (!to) return next(new AppError("to date must be specified", 400));

    let fromDate = new Date(from);
    let toDate = new Date(to);
    if (fromDate == "Invalid Date") return next(new AppError("Invalid from date", 400));
    if (toDate == "Invalid Date") return next(new AppError("Invalid to date", 400));

    fromDate = new Date(fromDate).setHours(0, 0, 0);
    toDate = new Date(toDate).setHours(23, 59, 59, 999);

    const fields = ["status", "type", "txnId", "ref", "createdAt", "other.txnDate", "amount"].join(" ");

    const docs = await Transaction.find({ user: req.user._id, tnxTimestamp: { $gte: fromDate, $lte: toDate } }).select(fields);

    res.json({
        status: "success",
        message: "report generated successfully",
        result: docs,
    });
});

exports.depositMoneyToUserAccount = catchAsync(async (req, res, next) => {
    const data = req.body;

    console.log(data);

    if (!data.user) return next(new AppError("User is required", 400));
    if (!data.amount) return next(new AppError("Amount is required", 400));

    const user = await User.findById(data.user);

    const txnDate = formatDate(+new Date(), "yyyy-mm-dd hh:mm:ss");
    const doc = await Transaction.create({ status: "TXN_SUCCESS", amount: Number(data.amount), type: "deposit", user: data.user, tnxTimestamp: +new Date(), mobile: user.mobile, orderId: uniqueId("numeric"), ref: "wallet", other: { txnDate } });
    // const doc = await Transaction.create({ status: 'TXN_SUCCESS', amount: Number(data.amount), type: 'deposit', user: data.user, uoid: uniqueId(), tnxTimestamp: +new Date(), mobile: user.mobile, orderId: uniqueId("numeric"), ref: 'wallet', other: { txnDate } });

    const wallet = await Wallet.findOne({ user: user._id });
    let walletAmount = wallet.balance + Number(data.amount);
    await Wallet.findByIdAndUpdate(wallet._id, { balance: walletAmount });

    res.json({
        status: "success",
        message: "Wallet updated successfully",
        result: doc,
    });
});
