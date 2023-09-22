require("dotenv").config();
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { v4 } = require("uuid");
const uuidv4 = v4;

const validateID = require("../utils/validateId");
const config = require("../config/config");
// const VideoSDKMeetingV1 = require('../models/v1.meeting.model');
const VideoSDKMeeting = require("../models/meeting.model");
// const MeetingWebhook = require('../utils/meetingWebhook');
const VideoSDKLiveStream = require("../models/liveStreaming.model");
const Follow = require("../models/follow.model");
const User = require("../models/users.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Helper = require("../utils/helper");
// const Transaction = require('../models/transactions.model');
const constants = require("../config/constants");
const Wallet = require("../models/wallet.model");
// const formatDate = require('../utils/formatDate');
const { encrypt, decrypt } = require("../utils/crypto");
const Transaction = require("../models/transactions.model");

// (async () => {
// 	await VideoSDKLiveStream.updateMany({ __v: 0 }, { status: 'ended' });
// })();
// const fbServiceKey = path.resolve(__dirname, `../${process.env.FIREBASE_JSON_FILE}`);
// const configFB = { credential: firebaseAdmin.credential.cert(fbServiceKey) };
// const firebaseApp = firebaseAdmin.initializeApp(configFB);
// const messaging = firebaseAdmin.messaging(firebaseApp);

const messaging = Helper.getFirbaseMessaging;

const VIDEOSDKBASEURL = `${config.videoSDKApiBaseUrl}/${config.videoSDKApiVersion}`;
const REGION = config.region;
const CUTTLYBASEURL = config.cuttlyBaseUrl;
const CUTTLYAPIKEY = process.env.CUTTLY_API_KEY;

const SECRET = process.env.VIDEOSDK_SECRET_KEY;
const CLOUDSHOPE_AUTH_TOKEN = process.env.CLOUDSHOPE_AUTH_TOKEN;
const payload = {
    apikey: process.env.VIDEOSDK_API_KEY,
    version: 2,
    permissions: ["allow_join", "allow_mod"],
};

const options = {
    expiresIn: "10m",
    algorithm: "HS256",
};

exports.validateRoom = catchAsync(async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) throw new Error("No room id provided");

        const token = jwt.sign(payload, SECRET, options);

        const headers = {
            Authorization: token,
            "Content-Type": "application/json",
        };

        const { data } = await axios.get(`${VIDEOSDKBASEURL}/rooms/validate/${id}`, { headers: headers });

        res.json({
            status: "success",
            message: "Data fetched successfully",
            result: data,
        });
    } catch (err) {
        if (err.response) {
            return res.json({
                status: "fail",
                message: err?.response?.data?.message || err?.response?.data || "Unknow error occur. Please try again.",
            });
        }

        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
});

exports.validateVideoSDKToken = catchAsync(async (req, res, next) => {
    const { token, customRoomId } = req.body;

    try {
        if (!token) return next(new AppError("Token is required", 400));
        if (!customRoomId) return next(new AppError("Custom Room Id is required", 400));
        // if (!validateID(customRoomId)) return next(new AppError('Invalid room id', 400));

        const data = jwt.verify(token, SECRET);
        if (!data) return next(new AppError("Token is invalid", 406));
        if (!data?.apikey) return next(new AppError("Token is invalid", 406));

        if (data.apikey !== payload.apikey) return new AppError("Token is invalid", 406);

        const stream = await VideoSDKLiveStream.findOne({ "streaming.customRoomId": customRoomId, status: "ongoing" }, "status");
        if (!stream) return new AppError("Astrologer is not live", 406);

        res.json({
            status: "success",
            message: "Token is valid",
        });
    } catch (err) {
        next(new AppError(err.message, err.statusCode));
    }
});

exports.getVideoSDKtokenAndMeetingId = async (req, res) => {
    const { id: idR, mobile, name, type } = req.body;
    const user = req.user;
    const wallet = req.wallet;

    try {
        if (!idR) throw new Error("Receiver user id is required");
        if (!name) throw new Error("Receiver user name is required");
        if (!mobile) throw new Error("Receiver user mobile is required");

        const astro = await User.findUser({ _id: idR }, "charges");
        if (!astro) return next("No astrologer found.", 404);

        const charges = astro.charges[constants.mobile_call.key] || 0;

        if (wallet.balance < charges * 7) return next(new AppError("Low wallet balance", 402));

        const token = jwt.sign(payload, SECRET, options);

        const headers = {
            Authorization: token,
            "Content-Type": "application/json",
        };

        const ctsmRoomId = uuidv4();

        const body = {
            region: REGION,
            customRoomId: ctsmRoomId,
            webhook: {
                endPoint: `${config.serverUrl}/api/v1/videosdk/webhooks-rooms-calls?customRoomId=${ctsmRoomId}`,
                events: ["participant-joined", "session-ended"],
            },
        };

        // console.log(body);

        // webhook: {
        // 	endPoint: `${config.serverUrl}/api/v1/videosdk/webhooks-rooms-calls`,
        // 	events: ['participant-joined', 'session-ended']
        // }
        // events: ['participant-joined', 'participant-left', 'session-started', 'session-ended']

        const { data } = await axios.post(`${VIDEOSDKBASEURL}/rooms`, body, { headers: headers });
        data.token = token;

        res.json({
            status: "success",
            message: "Data fetched successfully",
            result: data,
        });

        // const meetingUser = { id: user._id, name: user.name, mobile: user.mobile };
        // const receivedUser = { id: idR, name, mobile };

        const { id, roomId, customRoomId } = data;
        // const { id, roomId, customRoomId, ...other } = data;

        await VideoSDKMeeting.create({ status: "pending", call: { id, roomId, customRoomId, type }, user: user._id, astrologer: idR });
        // await VideoSDKMeetingV1.create({ status: "pending", meeting: { id, roomId, customRoomId, type }, user: meetingUser, receivedUser, other });
    } catch (err) {
        if (err.response) {
            return res.json({
                status: "fail",
                message: err?.response?.data?.message || err?.response?.data || "Unknow error occur. Please try again.",
            });
        }

        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

exports.addLiveStreaming = async (req, res) => {
    const user = req.user;
    const { liveStreamingDate, liveStreamingTime, topic, description } = req.body;

    try {
        if (user.role !== "astrologer") throw new Error("You are not allowed to access this resource");

        if (!topic) throw new Error("Must provide a topic");
        if (!liveStreamingDate) throw new Error("Must provide a live streaming Date");
        if (!liveStreamingTime) throw new Error("Must provide a live streaming Time");

        // const astrologer = { id: user._id, name: user.name, mobile: user.mobile };

        const doc = await VideoSDKLiveStream.create({ topic, description, liveStreamingDate, liveStreamingTime, user: user._id, streaming: { customRoomId: uuidv4() } });

        res.json({
            status: "success",
            message: "Data added successfully",
            result: doc,
        });

        const { _id, name, mobile, profilePhoto } = user;
        Helper.getSocketIo()
            .sockets.in("astrologers")
            .emit("add-astrologers-live-streams", { ...doc.toJSON(), user: { _id, name, mobile, profilePhoto, charges: user.charges } });
        if (printLog) console.log("Add Live Stream Emited Success");
    } catch (err) {
        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

exports.removeLiveStreaming = async (req, res) => {
    const { _id } = req.user;
    const { id } = req.params;

    try {
        if (!id) throw new Error("live stream id is required");

        const preDoc = await VideoSDKLiveStream.findById(id, "user");
        if (!preDoc) throw new Error("No live stream found");
        if (preDoc.user.toString() !== _id.toString()) throw new Error("You are not allowed to do this task");

        const doc = await VideoSDKLiveStream.findByIdAndDelete(id);
        if (!doc) throw new Error("No live stream found");

        Helper.getSocketIo().sockets.in("astrologers").emit("remove-astrologers-live-streams", id);
        if (printLog) console.log("Remove Live Stream Emited Success");

        res.json({
            status: "success",
            message: "document removed successfully",
            result: doc,
        });
    } catch (err) {
        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

exports.getRoomForLiveStreaming = async (req, res) => {
    const user = req.user;
    const reqBody = req.body;

    try {
        if (user.role !== "astrologer") throw new Error("You are not allowed to access this resource");
        if (!reqBody.id) throw new Error("Must provide a live streaming ID");
        if (!validateID(reqBody.id)) throw new Error("Invalid streaming ID");

        // const liveRoom = await VideoSDKLiveStream.findById(reqBody.id, 'status streaming');
        // if (!liveRoom) throw new Error("No room with id: " + reqBody.id);

        // if (liveRoom.status === 'ended') throw new Error("Live stream is already ended");
        // if (liveRoom.status === 'ongoing') {
        // 	return res.json({
        // 		status: 'success',
        // 		message: 'Data fetched successfully',
        // 		result: liveRoom
        // 	});
        // }

        const stream = await VideoSDKLiveStream.findById(reqBody.id, "streaming.customRoomId");
        if (!stream) throw new Error("No live stream found");

        const token = jwt.sign(payload, SECRET, { ...options, expiresIn: "5h" });

        const headers = {
            Authorization: token,
            "Content-Type": "application/json",
        };

        const body = {
            region: REGION,
            customRoomId: stream?.streaming?.customRoomId || uuidv4(),
        };
        // webhook: {
        // 	endPoint: `${config.serverUrl}/api/v1/videosdk/webhooks-rooms-streaming`,
        // 	events: ['participant-joined', 'participant-left', 'session-ended']
        // }
        // events: ['participant-joined', 'participant-left', 'session-started', 'session-ended']

        const { data } = await axios.post(`${VIDEOSDKBASEURL}/rooms`, body, { headers: headers });

        res.json({
            status: "success",
            message: "Data fetched successfully",
            result: { ...data, token },
        });

        const { id, roomId } = data;

        await VideoSDKLiveStream.findByIdAndUpdate(reqBody.id, { status: "ongoing", streaming: { id, roomId, token, customRoomId: stream?.streaming?.customRoomId || data.customRoomId } });
    } catch (err) {
        if (err.response) {
            return res.json({
                status: "fail",
                message: err?.response?.data?.message || err?.response?.data || "Unknow error occur. Please try again.",
            });
        }

        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

//Currently not in use;
// exports.startHLS = async (req, res) => {
// 	const user = req.user;
// 	const reqBody = req.body;

// 	try {
// 		if (user.role !== 'astrologer') throw new Error("You are not allowed to access this resource");

// 		if (!reqBody.id) throw new Error("Missing id in request body");
// 		if (!validateID(reqBody.id)) throw new Error("Invalid roomId in request body");
// 		if (!reqBody.roomId) throw new Error("Missing roomId in request body");

// 		const liveRoom = await VideoSDKLiveStream.findById(reqBody.id, 'status');
// 		if (!liveRoom) throw new Error("No room with id: " + reqBody.id);

// 		const token = jwt.sign(payload, SECRET, options);

// 		const headers = {
// 			"Authorization": token,
// 			"Content-Type": "application/json",
// 		};

// 		const body = {
// 			roomId: reqBody.roomId,
// 		}

// 		const { data } = await axios.post(`${VIDEOSDKBASEURL}/hls/start`, body, { headers: headers });

// 		res.json({
// 			status: 'success',
// 			message: 'Data fetched successfully',
// 			result: data
// 		});

// 		await VideoSDKLiveStream.findByIdAndUpdate(reqBody.id, { status: "ongoing", "streaming.downstreamUrl": data.downstreamUrl });

// 	} catch (err) {
// 		res.json({
// 			status: 'fail',
// 			message: err.message || "Unknow error occur. Please try again."
// 		});
// 	}
// };

exports.endLiveStream = async (req, res) => {
    const user = req.user;
    const reqBody = req.body;

    try {
        if (user.role !== "astrologer") throw new Error("You are not allowed to access this resource");

        if (!reqBody.id) throw new Error("Missing id in request body");
        if (!validateID(reqBody.id)) throw new Error("Invalid roomId in request body");

        const doc = await VideoSDKLiveStream.findByIdAndUpdate(reqBody.id, { status: "ended" });
        if (!doc) throw new Error("No room with id: " + reqBody.id);

        res.json({
            status: "success",
            message: "Live stream ended successfully",
        });
    } catch (err) {
        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

exports.getLiveStreamingForAstrologer = async (req, res) => {
    const user = req.user;
    try {
        if (!user._id) throw new Error("Not logged in");
        if (user.role !== "astrologer") throw new Error("You are not allowed to access this resource");

        const find = {};
        find["user"] = user._id;
        find.status = { $ne: "ended" };

        let fields;
        if (req.query.fields) fields = req.query.fields.split(",").join(" ");

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = parseInt(req.query.sort) || -1;
        const skip = (page - 1) * limit;

        const totalDocuments = await VideoSDKLiveStream.countDocuments(find);
        const docs = await VideoSDKLiveStream.find(find).populate("user", "name mobile").skip(skip).limit(limit).select(fields).sort({ _id: sort });
        const totalPages = Math.ceil(totalDocuments / limit);

        res.json({
            status: "success",
            message: "Documents found.",
            totalPages,
            result: docs,
        });
    } catch (err) {
        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

exports.getLiveSteamingForUser = async (req, res) => {
    try {
        const find = {};
        find.status = { $ne: "ended" };

        // let fields = [];
        // if (req.query.fields) fields = req.query.fields.split(',').join(' ');
        // if (req.query.fields) {
        // 	req.query.fields.split(',').forEach(field => {
        // 		return fields[field] = 1;
        // 	});
        // 	fields["userId"] = 1;
        // }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = parseInt(req.query.sort) || 1;
        const skip = (page - 1) * limit;

        const totalDocuments = await VideoSDKLiveStream.countDocuments(find);
        // const docs = await VideoSDKLiveStream.find(find).skip(skip).limit(limit).select(fields).sort({ liveStreamingDate: sort });
        const docs = await VideoSDKLiveStream.aggregate([
            { $match: find },
            { $skip: skip },
            { $limit: limit },
            { $sort: { liveStreamingDate: sort } },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                    // pipeline: [
                    // 	{ $project: { _id: 1, mobile: 1, profilePhoto: 1, name: 1 } }
                    // ]
                },
            },
            {
                $project: { "user.email": 0, "user.status": 0, "user.deviceToken": 0, "user.password": 0, "user.role": 0, "user.bio": 0, "user.address": 0, "user.gender": 0, "user.dateOfBirth": 0, "user.placeOfBirth": 0, "user.timeOfBirth": 0, "user.city": 0, "user.gallery": 0, "user.createdAt": 0, "user.updatedAt": 0, "user.__v": 0, "user.Campaign_id": 0, "user.compileId": 0, "user.totalChatMin": 0, "user.totalCallMin": 0 },
            },
            { $unwind: "$user" },
        ]);
        const totalPages = Math.ceil(totalDocuments / limit);

        res.json({
            status: "success",
            message: `${docs.length} Documents found.`,
            totalPages,
            result: docs,
        });
    } catch (err) {
        res.json({
            status: "fail",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

exports.getLivetreamTransactions = catchAsync(async (req, res, next) => {
    const { liveStreamId } = req.query;

    if (!liveStreamId) return next(new AppError("Live Stream id is required", 400));
    if (!validateID(liveStreamId)) return next(new AppError("Live Stream id is invalid", 400));

    const docs = await Transaction.find({ user: req.user._id, livestream: liveStreamId }).populate({ path: "fromUser", select: "name" }).select("livestream amount ref fromUser");

    res.json({
        status: "success",
        messages: "data fetched successfully",
        results: docs,
    });
});

exports.createClicktoCall = catchAsync(async (req, res, next) => {
    const user = req.user;
    const wallet = req.wallet;
    const { astrologerId: astrologer } = req.body;

    if (!astrologer) return next(new AppError("Astrologer Id is required"));
    if (!validateID(astrologer)) return next(new AppError("Not valid astrologer id"));
    // if (!mobile) return next(new AppError('Astrologer Mobile number is required'));

    const astro = await User.findUser({ _id: astrologer }, "charges");
    if (!astro) return next("No astrologer found.", 404);

    const charges = astro.charges[constants.mobile_call.key] || 0;

    if (wallet.balance < charges * 7) return next(new AppError("Low wallet balance", 402));

    const customRoomId = uuidv4();

    const call = { id: uuidv4(), roomId: uuidv4(), customRoomId, type: constants.mobile_call.key };

    await VideoSDKMeeting.create({ status: "pending", call, user: user._id, astrologer });
    // await VideoSDKMeetingV1.create({ status: 'pending', meeting: call, user: { id: user._id, mobile: user.mobile }, receivedUser: { id: astrologer, mobile: mobile } });

    res.json({
        status: "success",
        message: "doc created successfully",
        result: {
            campaign_id: customRoomId,
        },
    });
});

exports.getAstrologerLiveStream = catchAsync(async (req, res, next) => {
    const data = req.body;
    if (_.isEmpty(data)) return next(new AppError("Empty body provided.", 400));
    if (!data.id) return next(new AppError("Please provide user id.", 400));
    if (!validateID(data.id)) return next(new AppError("Invalid id provided.", 400));

    const liveStream = await VideoSDKLiveStream.find({ status: "ongoing", user: data.id }).sort({ _id: -1 }).limit(1).select("streaming topic description status");
    if (liveStream.length === 0) return next(new AppError("Live Stream has ended or not started", 406));

    const token = jwt.sign(payload, SECRET, options);

    const result = { token, ...liveStream[0].toJSON() };

    res.json({
        status: "success",
        message: "data fetched successfully",
        result,
    });
});

exports.getLastLiveStreamOfAstrologer = catchAsync(async (req, res, next) => {
    const user = req.user;

    const liveStream = await VideoSDKLiveStream.find({ userId: user._id.toString(), $or: [{ status: "ongoing" }, { status: "ended" }], updatedAt: { $gte: new Date(+new Date() - 5 * 1000 * 60) } })
        .sort({ _id: -1 })
        .limit(1)
        .select("streaming topic description status");
    let message;
    if (liveStream.length === 0) message = "There are no streams were found.";

    res.json({
        status: "success",
        message: message || "You last live stream is here.",
        result: liveStream,
    });
});

exports.notifyOnLiveStream = async (req, res) => {
    try {
        const user = req.user;
        const data = req.body;

        if (user.role !== "astrologer") throw new Error("You are not allowed to access this resource");
        if (!data.title) throw new Error("Notification title is required");
        if (!data.description) throw new Error("Notification text is required");
        if (!data.meetingId) throw new Error("Notification Meeting Id is required");

        const token = jwt.sign(payload, SECRET, { expiresIn: "10h", algorithm: "HS256" });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = parseInt(req.query.sort) || -1;
        const skip = (page - 1) * limit;

        const find = {};
        find.followingId = user._id;
        const docs = await Follow.aggregate([
            { $match: find },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "follower",
                },
            },
            { $match: { "follower.isLegitDevice": true } },
            { $project: { "follower._id": 1, "follower.deviceToken": 1 } },
            { $unwind: "$follower" },
            { $skip: skip },
            { $limit: limit },
            { $sort: { _id: sort } },
        ]);

        if (docs.length === 0) throw new Error("You have no followers");
        // if (docs?.followers?.length === 0) throw new Error("You have no followers");

        let tokens = docs?.map((data) => data.follower.deviceToken);
        if (tokens.length === 0) throw new Error("You have no followers");

        // console.log(docs);
        // console.log(tokens);

        tokens = [...new Set(tokens)];

        const notifyMulti = {
            tokens,
            notification: {
                title: data.title,
                body: data.description,
            },
            data: {
                meetingId: data.meetingId,
                token,
                click_action: "ANDROID_CLICK_ACTION",
                name: user.name,
                profilePhoto: user.profilePhoto,
            },
        };

        await messaging.sendMulticast(notifyMulti);
        // const firebseResponse = await messaging.sendMulticast(notifyMulti);

        res.json({
            status: "success",
            message: "Notification send successfully.",
        });

        // const failedTokens = [];
        // if (firebseResponse.failureCount > 0) {
        // 	firebseResponse.responses.forEach((resp, index) => {
        // 		if (!resp.success) {
        // 			failedTokens.push(docs[index]?.follower?._id);
        // 		}
        // 	});
        // }

        // if (failedTokens.length > 0) {
        // 	try {
        // 		await User.updateMany({ _id: { $in: failedTokens } }, { isLegitDevice: false });
        // 	} catch (error) {
        // 		console.log(error);
        // 	}
        // }
    } catch (err) {
        res.json({
            status: "error",
            message: err.message || "Unknow error occur. Please try again.",
        });
    }
};

exports.generateSOSCall = catchAsync(async (req, res, next) => {
    const user = req.user;
    const body = req.body;

    if (!body.astrologer) return next(new AppError("astrologer is required", 400));
    if (!validateID(body.astrologer)) return next(new AppError("Not valid astrologer id", 400));

    const astrologer = await User.findById(body.astrologer, "mobile");
    if (!astrologer) return next(new AppError("No astrologer found", 400));

    if (user._id.toString() === body.astrologer) return next(new AppError("Invalid request", 400));

    const wallet = await Wallet.findOne({ user: user._id.toString() });
    if (!wallet) throw new AppError("No wallet found for this user", 500);

    const walletBalance = wallet.balance;
    const callCharges = astrologer.charges[constants.sos_call.key];

    if (!callCharges) throw new AppError("No call charges found for SOS call", 500);

    const minRequiredBalance = callCharges * 5;
    if (walletBalance < minRequiredBalance) throw new AppError(`USER: ${user.name} dosen't have enogh balance to generate call`, 403);

    let token = jwt.sign({ astrologer: astrologer._id.toString(), user: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "10m" });
    token = encrypt(token);

    const link = `http://192.168.0.105:5001/api/v1/videosdk/generate-sos-click-to-call?token=${encodeURIComponent(token)}`;
    if (printLog) console.log(link);

    // https://cutt.ly/api/api.php?key=73f4ff8d759a07c2e175eb6cf011034651598&short=https://youtube.com&userDomain=0&noTitle=1

    let shortLink;

    try {
        const { data: cuttlyRes } = await axios.get(`${CUTTLYBASEURL}/api/api.php`, { params: { key: CUTTLYAPIKEY, short: link, userDomain: 0, noTitle: 1 } });

        if (cuttlyRes && cuttlyRes?.url && cuttlyRes?.url?.status === 7) {
            shortLink = cuttlyRes.url.shortLink;
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        if (printLog) {
            console.error("cuttly error");
            console.error(err.message);
        }
        return next(new AppError("Something went wrong", 500));
    }

    // const link = `${config.serverUrl}/api/v1/videosdk/generate-sos-click-to-call?token=${token}`;

    try {
        const { data } = await axios.post("https://panelv2.cloudshope.com/api/send_sms?template_id=24174&sms_type=smart&type=Trans&var_header=OTP", {}, { headers: { Authorization: CLOUDSHOPE_AUTH_TOKEN }, params: { to: `${astrologer.mobile}|${shortLink}` } });
    } catch (err) {
        if (printLog) {
            console.error("cloudshope click-to-call error");
            console.error(err.message);
        }
        return next(new AppError("Something went wrong", 500));
    }

    res.json({
        status: "success",
        message: "SMS sent to astrologer",
        result: null,
    });
});

exports.handleSOSCall = catchAsync(async (req, res, next) => {
    let { token } = req.query;

    try {
        if (!token) throw new AppError("Not valid request. Please try again", 400);
        token = decodeURIComponent(token);
        token = decrypt(token);

        const verify = jwt.verify(token, process.env.JWT_SECRET);
        const { astrologer: aid, user: uid } = verify;

        if (!aid) throw new AppError("No astrologer provided", 500);
        if (!uid) throw new AppError("No user provided", 500);

        if (!validateID(aid)) throw new AppError("No astrologer provided", 500);
        if (!validateID(uid)) throw new AppError("No astrologer provided", 500);

        const astrologer = await User.findOne({ _id: aid }, "mobile name charges");
        if (!astrologer) throw new AppError(`No astrologer found for ${aid}`, 500);

        const user = await User.findOne({ _id: uid }, "mobile name gender profilePhoto");
        if (!user) throw new AppError(`No astrologer found for ${uid}`, 500);

        const wallet = await Wallet.findOne({ user: uid });
        if (!wallet) throw new AppError("No wallet found for this user", 500);

        const walletBalance = wallet.balance;
        const callCharges = astrologer.charges[constants.sos_call.key];

        if (!callCharges) throw new AppError("No call charges found for SOS call", 500);

        const minRequiredBalance = callCharges * 5;
        if (walletBalance < minRequiredBalance) throw new AppError(`USER: ${user.name} dosen't have enogh balance to generate call`, 403);

        const customRoomId = uuidv4();

        res.render("click_to_call", { user, astrologer });

        // const { data } = await axios.post('https://panelv2.cloudshope.com/api/click_to_call',
        // 	{},
        // 	{
        // 		headers: { "Authorization": CLOUDSHOPE_AUTH_TOKEN },
        // 		params: { from_number: astrologer.mobile, to_number: user.mobile, callback_url: `${config.serverUrl}/api/v1/videosdk/click-to-call?astro_campaign_id=${customRoomId}` }
        // 	}
        // )

        // if (data.status !== 'success') throw new Error(data.message);

        console.log("Run");

        // const call = { id: uuidv4(), roomId: uuidv4(), customRoomId, type: constants.mobile_call.key };
        // await VideoSDKMeeting.create({ status: 'pending', call, user: user._id, astrologer: astrologer._id });
    } catch (err) {
        console.log("Error in SOS Call Handle");
        console.log(err.message);
        let message;
        if (err.name == "TokenExpiredError") message = "The token for the call has expired.";
        if (err.name == "JsonWebTokenError") message = "The token for the call has expired";
        if (!err.statusCode || err.statusCode == 500) message = "Oops something went wrong. Please try again.";

        res.render("error", { message: message ? message : err.message });
    }
});

exports.callsWebhooks = async (req, res) => {
    res.status(200).send();

    try {
        const data = req.body;
        const { customRoomId } = req.query;

        if (!customRoomId) return;

        const { webhookType: type } = data;

        if (type === "participant-joined") {
            const { participantId, sessionId } = data?.data;
            await VideoSDKMeeting.findOneAndUpdate({ "call.customRoomId": customRoomId, $or: [{ user: participantId }, { astrologer: participantId }] }, { status: "ongoing", "call.sessionId": sessionId, $inc: { "call.participants": 1 } })
                .select("status")
                .lean();
            // await VideoSDKMeetingV1.findOneAndUpdate({ 'meeting.customRoomId': customRoomId }, { status: 'ongoing', 'meeting.sessionId': sessionId });
        }

        if (type === "session-ended") {
            const { sessionId, meetingId, start: startedAt, end: endedAt } = data?.data;
            const s = +new Date(startedAt);
            const e = +new Date(endedAt);

            const seconds = (e - s) / 1000;
            const duration = Math.floor(seconds).toString();

            const call = await VideoSDKMeeting.findOneAndUpdate({ "call.sessionId": sessionId, "call.roomId": meetingId, "call.customRoomId": customRoomId, "call.participants": 2 }, { status: "ended", startedAt, endedAt, duration });
            // const call = await VideoSDKMeeting.findOneAndUpdate({ 'call.sessionId': sessionId, 'call.roomId': meetingId, 'call.participants': 2 }, { status: 'ended', startedAt, endedAt, duration });
            // const call2 = await VideoSDKMeetingV1.findOneAndUpdate({ 'meeting.sessionId': sessionId, 'meeting.roomId': meetingId }, { status: 'ended', startedAt, endedAt, duration });

            if (!call) {
                let { user, astrologer } = await VideoSDKMeeting.findOneAndUpdate({ "call.customRoomId": customRoomId }, { status: "missed", startedAt, endedAt, duration }).lean();
                Helper.removeFromAstrologerQue(user, astrologer);
                return;
            }
            // if (!call2) return;

            let { user, astrologer } = call;

            Helper.removeFromAstrologerQue(user, astrologer);
            Helper.queMoneyDeductions({ user, astrologer, call, seconds }, "VideoSDK Call Webhook");

            await User.findByIdAndUpdate(astrologer.toString(), { $inc: { totalCallMin: Number(duration) } });
        }
    } catch (err) {
        console.error("VideoSDK Webhook Error");
        console.error(err.message);
    }
};

exports.offlineCallWebhook = async (req, res) => {
    res.status(200).send();

    // const printLog = true;

    const { astro_campaign_id, to_number_answer_time, answer_time, status, from_number_status, to_number_status, campaign_id, ...other } = req.query;
    if (printLog) console.log(req.query);
    //from_number, from_number_answer_time, to_number, to_number_answer_time, answer_time, status, extension, number, recording_url, from_number_status, to_number_status, campaign_id

    try {
        if (!astro_campaign_id) return;

        other.status = status;
        other.campaign_id = astro_campaign_id;
        other.answer_time = answer_time;
        other.to_number_status = to_number_status;
        other.from_number_status = from_number_status;
        other.to_number_answer_time = to_number_answer_time;

        const customRoomId = astro_campaign_id;

        const seconds = Number(answer_time);
        const duration = Math.floor(seconds).toString();

        const callStatus = from_number_status.toLowerCase() === "busy" ? "missed" : "ended";

        const call = await VideoSDKMeeting.findOneAndUpdate({ "call.customRoomId": customRoomId }, { status: callStatus, duration, other });

        if (!call) return;

        let { user, astrologer } = call;

        clearTimeout(scheduleDelete[user.toString()]);
        Helper.queMoneyDeductions({ user, astrologer, call, seconds }, "Offline Call Webhook");
        Helper.removeFromAstrologerQue(user, astrologer, "Offline Call Webhook");

        await User.findByIdAndUpdate(astrologer.toString(), { $inc: { totalCallMin: Number(duration) } });
    } catch (err) {
        console.error("Click to Call Webhook Error");
        console.error(err.message);
    }
};

exports.shortUrl = catchAsync(async (req, res, next) => {
    const { url } = req.query;

    try {
        if (!url) return next(new AppError("Url is required", 400));

        const { data } = await axios.get(`${CUTTLYBASEURL}/api/api.php`, { params: { key: CUTTLYAPIKEY, short: url, userDomain: 0, noTitle: 1 } });

        if (data && data?.url && data?.url?.status === 7) {
            shortLink = data.url.shortLink;

            res.json({
                status: "success",
                message: "Url sorted successfully",
                result: { shortLink },
            });
        } else {
            return next(new AppError("Something went wrong", 500));
        }
    } catch (err) {
        if (printLog) {
            console.error("cuttly error");
            console.error(err.message);
        }
        return next(new AppError("Something went wrong", 500));
    }
});
