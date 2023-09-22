const _ = require("lodash");
var ObjectId = require("mongodb").ObjectId;
const multer = require("multer");
const path = require("path");
// const { v4 } = require('uuid');
// const uuidv4 = v4;

const catchAsync = require("../utils/catchAsync");
const validateID = require("../utils/validateId");
const AppError = require("../utils/appError");
const User = require("../models/users.model");
const Block = require("../models/block.model");
const Wallet = require("../models/wallet.model");
const Follow = require("../models/follow.model");
const Transaction = require("../models/transactions.model");
const VideoSDKMeeting = require("../models/meeting.model");
const uniqueId = require("../utils/uniqueId");
// const Helper = require('../utils/helper');
// const VideoSDKLiveStream = require('../models/liveStreaming.model');

const imageKeyName = "ast-profile";
const galleryImageKeyName = "ast-gallery";

const types = ["app_voice_call", "app_video_call", "mobile_call", "app_messaging"];
// const types = [constants];

const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __dirname + "./../public/profile");
    },
    filename: async (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const { _id } = req.user;
        const { id } = req.query;

        let uniqueName = file.fieldname === "ast-profile" ? `${id || _id}${extension}` : `${new Date().getTime().toString()}-${_.kebabCase(file.originalname)}${extension}`;
        // let uniqueName = `${new Date().getTime().toString()}-${_.kebabCase(file.originalname)}${extension}`;
        cb(null, uniqueName);
    },
});

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new AppError("Not an image! Please upload only images.", 400), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
}).fields([
    { name: imageKeyName, maxCount: 1 },
    { name: galleryImageKeyName, maxCount: 12 },
]);

exports.getUsers = catchAsync(async (req, res, next) => {
    const find = {};

    //This will exclude deleted users from the query
    find["deleted.trash"] = false;

    let fields;
    const queryFields = req.query.fields;
    if (queryFields) fields = queryFields.split(",").join(" ");
    if (req.query.role) find.role = req.query.role;
    if (req.query.passed) find.passed = req.query.passed;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = parseInt(req.query.sort) || -1;
    const skip = (page - 1) * limit;

    const totalDocuments = await User.countDocuments(find);
    const users = await User.find(find).skip(skip).limit(limit).select(fields).sort({ _id: sort });
    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
        status: "success",
        message: "Documents found.",
        totalPages,
        result: users,
    });
});

exports.getUserById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const queryFields = req.query.fields;

    if (!id) return next(new AppError("No id specified to query.", 400));
    if (!validateID(id)) return next(new AppError(`Not valid id: ${id}`, 406));

    let fields;
    if (queryFields) fields = queryFields.split(",").join(" ");

    const user = await User.findById(id, fields);
    if (!user) return next(new AppError(`No document with this id: ${id}`, 404));
    if (user.status === "banned") return next(new AppError("user have been banned or removed", 403));

    res.json({
        status: "success",
        message: "Document found.",
        result: user,
    });
});

exports.updateUserById = catchAsync(async (req, res, next) => {
    const data = req.body;

    const select = ["+isLegitDevice", "+plateformCharges", "+rating.counts"];

    if (_.isEmpty(data)) return next(new AppError("empty response", 400));
    if (!data._id) return next(new AppError("User id is required to update", 400));
    if (!validateID(data._id)) return next(new AppError("Not valid id. Please check id", 400));

    const doc = await User.findByIdAndUpdate(data._id, data, { new: true }).select(select.join(" "));
    if (!doc) return next(new AppError("No use found for this id", 404));

    res.json({
        status: "success",
        message: "User updated successfully.",
        result: doc,
    });
});

exports.deleteUserById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const preDoc = await User.findById(id, "name email mobile");
    if (!preDoc) return next(new AppError("No user found for this id", 404));

    const random = parseInt(Math.random() * 100000000000);

    const data = {
        email: `deleted_user_email_${+new Date()}_${random}`,
        mobile: `deleted_user_mobile_${+new Date()}_${random}`,
        deleted: {
            trash: true,
            email: preDoc.email,
            mobile: preDoc.mobile,
        },
    };

    const doc = await User.findByIdAndUpdate(id, data, { new: true }).select("name");

    // const doc = await User.findByIdAndDelete(id).select('name');
    if (!doc) return next(new AppError("No user found for this id", 404));

    await Wallet.findOneAndDelete({ user: id });

    res.json({
        status: "success",
        message: "User deleted successfully.",
        result: doc,
    });
});

exports.changeProfilePhoto = catchAsync(async (req, res, next) => {
    const reqUser = req.user;

    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.field !== imageKeyName) return next(new AppError("Invalid field name.", 406));
            if (err.code === "LIMIT_UNEXPECTED_FILE") return next(new AppError("File upload limit reached. Max upload limit is 12", 400));
            return next(new AppError("Internal error.", 500));
        } else if (err) {
            // An unknown error occurred when uploading.
            return next(new AppError(err.message || "Unknow error occur. Please try again.", 500));
        }

        const files = req.files;

        if (_.isEmpty(files)) return next(new AppError("No Images to process.", 406));

        // console.log(req.files);
        // Everything went fine.
        let profilePhoto;

        if (files) {
            if (files[imageKeyName]) {
                const file = files[imageKeyName][0];
                profilePhoto = `/public/profile/${file.filename}`;
            }
        }

        if (!profilePhoto) return next(new AppError("Something went wrong when uploading. Please try again.", 406));

        const user = await User.findByIdAndUpdate(reqUser._id, { profilePhoto }, { new: true });

        res.json({
            status: "success",
            message: "Profile updated successfully.",
            result: user,
        });
    });
});

exports.uploadUserProfilePhoto = catchAsync(async (req, res, next) => {
    // const reqUser = req.user;
    const { id: userId } = req.query;
    if (!userId) return next(new AppError("Invalid request. Please check your request", 400));
    if (!validateID(userId)) return next(new AppError(`Not valid id: ${userId}`, 400));

    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.field !== imageKeyName) return next(new AppError("Invalid field name.", 406));
            if (err.code === "LIMIT_UNEXPECTED_FILE") return next(new AppError("File upload limit reached. Max upload limit is 12", 400));
            return next(new AppError("Internal error.", 500));
        } else if (err) {
            // An unknown error occurred when uploading.
            return next(new AppError(err.message || "Unknow error occur. Please try again.", 500));
        }

        const files = req.files;

        if (_.isEmpty(files)) return next(new AppError("No Images to process.", 406));

        // console.log(req.files);
        // Everything went fine.
        let profilePhoto;

        if (files) {
            if (files[imageKeyName]) {
                const file = files[imageKeyName][0];
                profilePhoto = `/public/profile/${file.filename}`;
            }
        }

        if (!profilePhoto) return next(new AppError("Something went wrong when uploading. Please try again.", 406));

        const user = await User.findByIdAndUpdate(userId, { profilePhoto }, { new: true }).select("profilePhoto");
        if (!user) return next(new AppError("Something went wrong", 500));

        res.json({
            status: "success",
            message: "Profile updated successfully.",
            result: user,
        });
    });
});

exports.getAstrologer = catchAsync(async (req, res, next) => {
    const user = req.user;

    const find = {};
    find.role = "astrologer";
    find["deleted.trash"] = false;
    find.passed = 1;

    if (req.query.skillset) {
        const skillsetArr = req.query.skillset.toLowerCase().split(",");
        find["skillset"] = { $all: skillsetArr };
        // const skills = req.query.skillset.toLowerCase().split(',');
        // find.skillset = {$all : skills};
    }
    if (req.query.expertise) {
        const expertiseArr = req.query.expertise.toLowerCase().split(",");
        find["expertise"] = { $all: expertiseArr };
        // const expertise = req.query.expertise.toLowerCase().split(',');
        // find.expertise = {$all : expertise};
    }
    if (req.query.languages) {
        const langsArr = req.query.languages.toLowerCase().split(",");
        find["languages"] = { $all: langsArr };
        // const langs = req.query.languages.toLowerCase().split(',');
        // find.languages = { $all: langs }
    }
    if (req.query.gender) find.gender = req.query.gender.toLowerCase();
    if (req.query.status) find.status = req.query.status;
    if (req.query.verified) find.verified = req.query.verified;
    if (req.query.recommended) find.recommended = req.query.recommended;
    if (req.query.specialized) find.specialized = req.query.specialized;
    if (req.query.calls) find.availableFor = { $all: req.query.call.toLowerCase().split(",") };

    let fields;
    const queryFields = req.query.fields;
    if (queryFields) fields = queryFields.split(",").join(" ");

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const sort = parseInt(req.query.sort) || -1;
    let sortBy = { _id: sort };

    if (req.query.price) sortBy = { "charges.app_voice_call": Number(req.query.price) };
    if (req.query.experience) sortBy = { experience: Number(req.query.experience) };
    if (req.query.rating) sortBy = { "rating.value": Number(req.query.rating) };
    if (req.query.name) sortBy = { name: Number(req.query.name) };

    const onlineAstroIds = Object.keys(astrologersQue);

    // console.log(find);

    let blockAstroIds = [];
    if (user) {
        const blockedBy = await Block.find({ blockedUser: user._id.toString() }, "blockedBy");
        blockAstroIds = blockedBy.map((block) => {
            if (onlineAstroIds.includes(block.blockedBy.toString())) onlineAstroIds.splice(onlineAstroIds.indexOf(block.blockedBy.toString()), 1);
            return block.blockedBy;
        });

        // find._id = { $nin: blockedByAstrologers };
    }

    find._id = { $nin: blockAstroIds };

    if (page === 1 && onlineAstroIds.length > 0) {
        find._id["$in"] = onlineAstroIds;
        limit = onlineAstroIds.length;
    }

    const totalDocuments = await User.countDocuments(find);
    const users = await User.find(find)
        .populate([
            { path: "offers", select: "type freeMins lowCharges limitedLowCharges" },
            { path: "expertise", select: "icon name" },
            { path: "languages", select: "icon name" },
            { path: "skillset", select: "icon name" },
        ])
        .skip(skip)
        .limit(limit)
        .select(fields)
        .sort(sortBy);

    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
        status: "success",
        message: `${users.length} Documents in ${totalPages} pages found.`,
        totalPages,
        result: users,
    });
});

exports.createAstrologer = catchAsync(async (req, res, next) => {
    const data = req.body;

    data.walletId = uniqueId();
    data.role = "astrologer";

    if (!data.mobile) return next(new AppError("Mobile number is required", 400));

    const doc = await User.create(data);
    await Wallet.create({ walletId: data.walletId, user: doc._id, mobile: doc.mobile, balance: 0, bonus: 0 });

    res.json({
        status: "success",
        message: "Created successfully",
        result: doc,
    });
});

exports.getAstrologerById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id) throw new Error(`Invalid input id is required.`);

    const find = {};
    find.role = "astrologer";
    find._id = id;

    let fields;
    const queryFields = req.query.fields;
    if (queryFields) fields = queryFields.split(",").join(" ");

    const user = await User.findOne(find, fields).populate([
        { path: "offers", select: "type freeMins lowCharges limitedLowCharges" },
        { path: "expertise", select: "icon name" },
        { path: "languages", select: "icon name" },
        { path: "skillset", select: "icon name" },
    ]);
    if (!user) return next(new AppError("No astrologer was found.", 404));

    res.json({
        status: "success",
        message: "Documents found.",
        result: user,
    });
});

exports.addGalleyPhotos = catchAsync(async (req, res, next) => {
    const reqUser = req.user;

    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.field !== galleryImageKeyName) return next(new AppError("Invalid field name.", 406));
            if (err.code === "LIMIT_UNEXPECTED_FILE") return next(new AppError("File upload limit reached. Max upload limit is 12", 400));
            return next(new AppError("Internal error.", 500));
        } else if (err) {
            // An unknown error occurred when uploading.
            return next(new AppError(err.message || "Unknow error occur. Please try again.", 500));
        }

        const files = req.files;

        if (_.isEmpty(files)) return next(new AppError("No Images to process.", 406));

        // console.log(req.files);
        // Everything went fine.
        let gallery;

        if (files) {
            if (files[galleryImageKeyName]) {
                const filesArr = files[galleryImageKeyName];
                gallery = filesArr.map((file) => `/public/profile/${file.filename}`);
            }
        }

        if (!gallery) return next(new AppError("Something went wrong when uploading. Please try again.", 406));

        const user = await User.findByIdAndUpdate(reqUser._id, { $push: { gallery: { $each: gallery } } }, { new: true });

        res.json({
            status: "success",
            message: "Profile updated successfully.",
            result: user,
        });
    });
});

exports.uploadUserGalleyPhotos = catchAsync(async (req, res, next) => {
    // const reqUser = req.user;
    const { id: userId } = req.query;

    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.field !== galleryImageKeyName) return next(new AppError("Invalid field name.", 406));
            if (err.code === "LIMIT_UNEXPECTED_FILE") return next(new AppError("File upload limit reached. Max upload limit is 12", 400));
            return next(new AppError("Internal error.", 500));
        } else if (err) {
            // An unknown error occurred when uploading.
            return next(new AppError(err.message || "Unknow error occur. Please try again.", 500));
        }

        const files = req.files;

        if (_.isEmpty(files)) return next(new AppError("No Images to process.", 406));

        // console.log(req.files);
        // Everything went fine.
        let gallery;

        if (files) {
            if (files[galleryImageKeyName]) {
                const filesArr = files[galleryImageKeyName];
                gallery = filesArr.map((file) => `/public/profile/${file.filename}`);
            }
        }

        if (!gallery) return next(new AppError("Something went wrong when uploading. Please try again.", 406));

        const user = await User.findByIdAndUpdate(userId, { $push: { gallery: { $each: gallery } } }, { new: true });
        if (!user) return next(new AppError("Something went wrong when uploading", 500));

        res.json({
            status: "success",
            message: "Profile updated successfully.",
            result: user,
        });
    });
});

exports.getWallet = catchAsync(async (req, res, next) => {
    const user = req.user;

    const doc = await Wallet.findOne({ user: user._id.toString() });
    if (!doc) return next(AppError("No wallet found", 404));

    res.json({
        status: "success",
        message: "Wallet found.",
        result: doc,
    });
});

exports.getWalletById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!validateID(id)) return next(new AppError("Invalid user id. check id", 400));

    const find = { user: new ObjectId(id) };

    const doc1 = await Wallet.findOne(find);
    if (!doc1) return next(new AppError("No wallet found", 404));

    const doc2 = await Transaction.aggregate([{ $match: find }, { $group: { _id: "$type", amount: { $sum: "$amount" } } }]);

    const doc = { ...doc1.toJSON(), totals: doc2 };

    res.json({
        status: "success",
        message: "Wallet found.",
        result: doc,
    });
});

exports.astrologerDashboardData = catchAsync(async (req, res, next) => {
    const user = req.user;

    if (user.role !== "astrologer") return next(new AppError("You are not allowed", 403));

    const today = +new Date().setHours(0, 0, 0, 0);
    const oneMonthAgo = +new Date(today).setMonth(new Date().getMonth() - 1);

    const totalFollowers = await Follow.countDocuments({ followingId: user._id });
    const todayEarnings = await Transaction.aggregate([{ $match: { user: user._id, tnxTimestamp: { $gte: today } } }, { $group: { _id: null, todayEarnings: { $sum: "$amount" } } }]);
    const monthlyEarnings = await Transaction.aggregate([{ $match: { user: user._id, tnxTimestamp: { $gte: oneMonthAgo } } }, { $group: { _id: null, monthlyEarnings: { $sum: "$amount" } } }]);

    res.json({
        status: "success",
        message: "data fetched successfully",
        result: {
            totalFollowers: totalFollowers,
            todayEarnings: todayEarnings.length > 0 ? todayEarnings[0].todayEarnings : 0,
            monthlyEarnings: monthlyEarnings.length > 0 ? monthlyEarnings[0].monthlyEarnings : 0,
        },
    });
});

exports.getEarnings = catchAsync(async (req, res, next) => {
    const user = req.user;

    // const find = { user: user._id };

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    const select = req.query.select === "all" ? "" : req.query.select?.split(",").join(" ") || "status amount currency orderId txnId tnxTimestamp type ref other.txnDate rating meeting";

    const by = req.query.by;
    if (!by) return next(new AppError("Filter by is required", 400));

    // const today = +new Date().setHours(0, 0, 0, 0);
    let filter = {};
    filter.type = "deposit";

    filter.user = user._id.toString();

    if (req.query.type) {
        if (types.indexOf(req.query.type) === -1) return next(new AppError(`type must be one of ${types.join(", ")}`));
        filter.ref = req.query.type;
    }

    if (by === "date") {
        let sd = Number(req.query.startDate);
        let ed = Number(req.query.endDate);
        let sDate = new Date(sd ? sd : req.query.startDate);
        let eDate = new Date(ed ? ed : req.query.endDate);

        if (sDate == "Invalid Date" || eDate == "Invalid Date") return next(new AppError("Invalid date provided", 400));

        sDate = new Date(sDate).setHours(0, 0, 0, 0);
        eDate = new Date(eDate).setHours(23, 59, 59, 999);

        if (eDate < sDate) return next(new AppError("End Date must be greater than Start Date", 400));

        filter.tnxTimestamp = { $gte: sDate, $lte: eDate };
    }

    const totalDocuments = await Transaction.countDocuments(filter);
    const docs = await Transaction.find(filter)
        .populate([
            { path: "fromUser", select: "name profilePhoto" },
            { path: "meeting", select: "duration rating" },
        ])
        .skip(skip)
        .limit(limit)
        .select(select);
    const totalPages = Math.ceil(totalDocuments / limit);

    res.json({
        status: "success",
        message: "transaction history fetched successfully",
        totalPages,
        result: docs,
    });
});

exports.getAstrologerQueUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id) return next(new AppError("User is is required", 400));
    if (!validateID(id)) return next(new AppError("Invalid id provided", 400));

    if (!astrologersQue[req.user._id.toString()]) return next(new AppError("Invalid request. You do not have any que", 400));
    if (!astrologersQue[req.user._id.toString()]?.que?.get(id)) return next(new AppError("This user is not in your que", 400));

    const doc = await User.findUser({ _id: id }, "name profilePhoto dateOfBirth placeOfBirth timeOfBirth gender").lean();
    if (!doc) return next(new AppError("User not found", 404));

    res.json({
        status: "success",
        message: "Details fetched successfully",
        result: doc,
    });
});

exports.getUserOrders = catchAsync(async (req, res, next) => {
    const user = req.user;

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;

    let find = {};
    if (user.role === "user") find.user = user._id.toString();
    else find.astrologer = user._id.toString();

    const populate = [];
    if (user.role === "user") {
        const d = { path: "transactionU", select: "status type amount orderId txnId tnxTimestamp other.txnDate" };
        const u = { path: "astrologer", select: "status name profilePhoto" };
        populate.push(d);
        populate.push(u);
        populate.push({ path: "review", select: "rating comment choiceText meeting", match: { user: user._id } });
    }

    if (user.role === "astrologer") {
        const d = { path: "transactionA", select: "status type amount orderId txnId tnxTimestamp other.txnDate" };
        const a = { path: "user", select: "status name profilePhoto" };
        populate.push(d);
        populate.push(a);
    }

    const totalDocuments = await VideoSDKMeeting.countDocuments(find);
    const docs = await VideoSDKMeeting.find(find).populate(populate).skip(skip).limit(limit).select("status duration call.type transaction user rating createdAt").sort({ _id: -1 });
    const totalPages = Math.ceil(totalDocuments / limit);
    // console.log(docs);

    res.json({
        status: "success",
        message: "data fetched successfully",
        totalPages,
        result: docs,
    });
});

exports.getLiveVariables = catchAsync(async (req, res, next) => {
    const { q } = req.query;

    if (!q) return next(new AppError("Invalid request", 400));

    // const abc = Helper.getSocketIo().sockets.sockets.size;
    // console.log(abc);

    let data = {};
    if (q === "live-ast") data = liveAstrologers;
    if (q === "que-ast") data = astrologersQue;
    if (q === "online-ast") data = onlineAstrologers;
    if (q === "onlile-usr") data = [...onlineUsers?.values()];
    if (q === "inque-user") data = [...inQueUsers?.values()];
    if (q === "sche-delete") data = scheduleDelete;
    if (q === "log-status") data.printLog = printLog;
    if (q === "log-toggle") {
        printLog = !printLog;
        data.printLog = printLog;
    }

    res.json({
        status: "success",
        message: "data fetched successfully",
        result: data,
    });
});
