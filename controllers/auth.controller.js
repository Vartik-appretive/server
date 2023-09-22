require("dotenv").config();
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/users.model");
const Admin = require("../models/admin.model");
const validateID = require("../utils/validateId");
const { encrypt } = require("../utils/crypto");
const { tempFollow } = require("../utils/tempFollowAll");
const Wallet = require("../models/wallet.model");
const ActiveLoginToken = require("../models/activeLoginTokens.model");
const uniqueId = require("../utils/uniqueId");

const removeFields = ["role", "followers", "prizes", "likes", "rating", "rating.value", "rating.counts", "verified", "specialized", "recommended", "totalChatMin", "totalCallMin", "deleted", "charges", "charges.app_video_call", "charges.app_voice_call", "charges.mobile_call", "charges.app_messaging", "charges.sos_call"];

exports.isExistingUser = catchAsync(async (req, res, next) => {
    const { mobile } = req.body;
    if (!mobile) return next(new AppError("Mobile number is required", 401));

    const user = await User.findOne({ mobile, "deleted.trash": false }, "mobile");
    if (!user) return next(new AppError(`No Account with mobile number ${mobile}. Please check mobile number`, 404));

    res.json({
        status: "success",
        message: "Mobile number has a Account",
        result: { mobile: user.mobile },
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const data = req.body;

    if (!data.mobile) return next(new AppError("Mobile number required", 400));

    const query = { mobile: data.mobile };
    if (data.email) query.email = data.email;

    const preUser = await User.findUser(query).populate([
        { path: "expertise", select: "icon name" },
        { path: "languages", select: "icon name" },
        { path: "skillset", select: "icon name" },
    ]);

    if (!preUser && !data.email) return next(new AppError("Email is required", 400));
    // if(!user) return next(new AppError(`No Account with mobile number ${mobile}. Please check mobile number`, 401));

    let user;
    removeFields.forEach((field) => {
        // if(field === 'role') return;
        delete data[field];
    });

    data.walletId = uniqueId();

    data.role = "user";

    if (!preUser) {
        if (data.role === "user") data.passed = 1;
        const newuser = await User.create(data);
        user = await User.findById(newuser._id.toString()).populate([
            { path: "expertise", select: "icon name" },
            { path: "languages", select: "icon name" },
            { path: "skillset", select: "icon name" },
        ]);
    } else {
        user = preUser;
    }

    let token = (tokenCopy = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "21d" }));
    token = encrypt(token);

    res.cookie("cwtct", token, {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20), //20 Days
        // httpOnly: true,
        // secure: process.env.NODE_ENV !== "development",
        // sameSite: 'none'
    });

    res.json({
        status: "success",
        message: "login in success",
        token,
        result: user,
    });

    await ActiveLoginToken.findOneAndUpdate({ user: user._id.toString() }, { user: user._id.toString(), token: tokenCopy }, { upsert: true });

    if (!preUser) {
        await Wallet.create({ walletId: user.walletId, user: user._id, mobile: user.mobile, balance: 0 });
        // tempFollow(user._id, user.role == "user" ? false : true);
    }
});

exports.adminLogin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email) return next(new AppError("Email is required", 401));
    if (!password) return next(new AppError("Password is required", 401));

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) return next(new AppError("Invalid credentials. Check Email & Password", 401));

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return next(new AppError("Invalid credentials. Check Email & Password", 401));

    let token = jwt.sign({ id: { email: admin.email, password: admin.password } }, process.env.JWT_SECRET, { expiresIn: "21d" });
    if (!token) return next(new AppError("Something went wrong. Please try Again.", 500));

    token = encrypt(token);

    admin.password = undefined;

    // res.cookie("cwtct", token, {
    // 	expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20), //20 Days
    // 	// httpOnly: true,
    // 	// secure: process.env.NODE_ENV !== "development",
    // 	// sameSite: 'none'
    // });

    res.json({
        status: "success",
        message: "login in success",
        token,
        result: admin,
    });
});

exports.authCheck = catchAsync(async (req, res, next) => {
    const user = req.user;

    res.json({
        status: "success",
        message: "User is logged in",
        result: user,
    });
});

exports.updateUser = catchAsync(async (req, res, next) => {
    const { _id: id } = req.user;
    const data = req.body;

    if (_.isEmpty(data)) return next(new AppError("Invalid request. Empty request found", 406));

    removeFields.forEach((field) => {
        delete data[field];
    });

    let user;
    if (req.user.role === "administrator") user = await Admin.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    else
        user = await User.findByIdAndUpdate(id, data, { new: true }).populate([
            { path: "expertise", select: "icon name" },
            { path: "languages", select: "icon name" },
            { path: "skillset", select: "icon name" },
        ]);

    if (!user) return next(new AppError("No user found with this id.", 404));

    res.json({
        status: "success",
        message: "Document updated successfully.",
        result: user,
    });
});

exports.changePassword = catchAsync(async (req, res, next) => {
    const user = req.user;
    const { newPassword, confirmNewPassWord, currentPassword } = req.body;

    if (!user || !user._id || !validateID(user._id.toString())) return next(new AppError("Not Authorised!", 401));

    if (!newPassword) return next(new AppError("Provide new password to update", 401));
    if (!confirmNewPassWord) return next(new AppError("Provide confirm password to update", 401));
    if (!currentPassword) return next(new AppError("Provide current password to update", 401));
    if (newPassword.length < 8) return next(new AppError("Password must be grater than 8 digits.", 401));
    if (newPassword.length > 32) return next(new AppError("Password must be less than 32 digits.", 401));
    if (newPassword !== confirmNewPassWord) return next(new AppError("password and confirm password are not same.", 401));

    const authUser = await User.findById(user._id).select("+password");
    if (!authUser) return next(new AppError("Not Authorised!", 401));

    const valid = await bcrypt.compare(currentPassword, authUser.password);
    if (!valid) throw new Error("Invalid credentials. Please check Email and Password", 401);

    const password = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, { password }, { new: true });

    authUser.password = undefined;

    res.json({
        status: "success",
        message: "password updated successfully",
        result: authUser,
    });
});
