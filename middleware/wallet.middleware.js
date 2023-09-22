// const User = require("../models/users.model");
const Wallet = require("../models/wallet.model");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.checkWallet = catchAsync(async (req, res, next) => {
	const { _id } = req.user;

	const wallet = await Wallet.findOne({ user: _id.toString() });

	if (wallet.balance == 0) return next(new AppError("Low wallet balance", 402));

	req.wallet = wallet

	next();
});