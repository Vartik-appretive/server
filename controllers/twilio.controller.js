const twilio = require("twilio");
const { v4 } = require('uuid');
const TwilioChat = require("../models/twilio.model");
const uuidv4 = v4;

const AppError = require("../utils/appError");

const catchAsync = require("../utils/catchAsync");
const validateID = require("../utils/validateId");

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_ACCOUNT_API_KEY;
const twilioApiSecret = process.env.TWILIO_ACCOUNT_API_SECRET;
const twilioApiAuthToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_ACCOUNT_SERVICE_SID;

const AccessToken = twilio.jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const twilioClient = twilio(twilioAccountSid, twilioApiAuthToken);

exports.generateChatToken = catchAsync(async (req, res, next) => {
	const user = req.user;
	const { userId: id, astrologerId } = req.query;
	if (!id) return next(new AppError('Identity must be provided', 400));
	if (!astrologerId) return next(new AppError('Identity must be provided', 400));
	if (!validateID(id)) return next(new AppError('Not valid user id', 400));
	if (!validateID(astrologerId)) return next(new AppError('Not valid astrologer id', 400));

	let uaid;
	let identity;
	if (user.role === 'user') {
		if (user._id.toString() !== id) return next(new AppError('Not authorized to access this resource', 401));
		uaid = `${id}${astrologerId}`;
		identity = id;

	} else {
		if (user._id.toString() !== astrologerId) return next(new AppError('Not authorized to access this resource', 401));
		uaid = `${id}${astrologerId}`;
		identity = astrologerId;
	}


	let twilioChatDetails = await TwilioChat.findOne({ uaid }, 'uniqueName');

	if (!twilioChatDetails && user.role === 'astrologer') {
		const resolveAfterXSeconds = (x) => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve("success");
				}, x * 1000);
			});
		}

		await resolveAfterXSeconds(10);

		twilioChatDetails = await TwilioChat.findOne({ uaid }, 'uniqueName');
	}

	if (!twilioChatDetails) {
		const data = await twilioClient.conversations.v1.conversations.create({ friendlyName: uaid, uniqueName: uuidv4() });

		const { sid, uniqueName, messagingServiceSid, ...other } = data.toJSON();
		twilioChatDetails = await TwilioChat.create({ user: id, astrologer: astrologerId, uaid, sid, uniqueName, messagingServiceSid, other });

		await twilioClient.conversations.v1.conversations(sid).participants.create({ identity: id });
		await twilioClient.conversations.v1.conversations(sid).participants.create({ identity: astrologerId });
	}

	const chatGrant = new ChatGrant({
		serviceSid: serviceSid,
	});

	const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { identity: identity });
	token.addGrant(chatGrant);

	res.json({
		status: 'success',
		message: 'Access token generated successfully',
		result: {
			identity: identity,
			token: token.toJwt(),
			uniqueName: twilioChatDetails.uniqueName
		}
	});
});

exports.getConversations = catchAsync(async (req, res, next) => {
	const data = await twilioClient.conversations.v1.conversations.list();
	// console.log(data);
	// const ids = data.map(c => c.sid);
	// console.log(ids);

	res.json({
		status: 'success',
		message: 'conversations fetched successfully',
		result: data
	});
});

exports.createConversations = catchAsync(async (req, res, next) => {
	try {
		const data = await twilioClient.conversations.v1.conversations.create({ friendlyName: 'My First Conversation', uniqueName: uuidv4() });

		res.json({
			status: 'success',
			message: 'conversations fetched successfully',
			result: data
		});

	} catch (err) {
		return next(new AppError(err.message, 500));
	}
});

exports.deleteConversation = catchAsync(async (req, res, next) => {
	const data = req.body;
	const { id } = data;
	try {
		if (!id) return next(new AppError('conversation id is required', 400));

		const data = await twilioClient.conversations.v1.conversations(id).remove();

		// const ids = ['CH23ef71cbf8f5493eb4cd799da1c2b867', 'CH6404f76e23534d2d96238ee300789dac', 'CH7ea06b1362e64dce98c02519bab6468b', 'CHc02f42ef9dd6483e88bb2bd7a961429d', 'CHebbb1b7053274386b6117f40ef4519f1', 'CHee250d73945b45bc906d046721cd19c5'];

		// ids.forEach(async (id) => {
		// 	await twilioClient.conversations.v1.conversations(id).remove();
		// });

		res.json({
			status: 'success',
			message: 'conversation deleted successfully',
			result: data
		});

	} catch (err) {
		console.error(err);
		return next(new AppError(err.message, 500));
	}
});

exports.createParticipant = catchAsync(async (req, res, next) => {
	try {
		const { conversation } = req.params;
		if (!conversation) return next(new AppError('conversation id is required', 400));

		const data = await twilioClient.conversations.v1.conversations(conversation).participants.create({ identity: '635f9e314b8c36e2fd7034c5' });
		// console.log(data);
		// 635f9e314b8c36e2fd7034c5
		// 635f9f14c0bfce6c81a7f0f0

		res.json({
			status: 'success',
			message: 'participant created successfully',
			result: data
		});

	} catch (err) {
		return next(new AppError(err.message, 500));
	}
});

exports.getParticipantInConversation = catchAsync(async (req, res, next) => {
	try {
		const { conversation } = req.params;
		if (!conversation) return next(new AppError('conversation id is required', 400)); //'CHc02f42ef9dd6483e88bb2bd7a961429d'
		const data = await twilioClient.conversations.v1.conversations(conversation).participants.list({ limit: 10 });

		res.json({
			status: 'success',
			message: 'conversation\'s participants fetched successfully',
			result: data
		});

	} catch (err) {
		return next(new AppError(err.message, 500));
	}
});