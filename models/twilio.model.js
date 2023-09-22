const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const twilioChatSchema = new Schema({
	user: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'users',
	},
	astrologer: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'users',
	},
	uaid: {
		type: String,
		required: true,
		unique: true,
		select: false
	},
	sid: {
		type: String,
		required: true,
		index: true
	},
	uniqueName: {
		type: String,
		required: true,
		unique: true
	},
	messagingServiceSid: {
		type: String,
		required: true,
		index: true
	},
	other: {
		type: Object,
		select: false,
		default: {}
	}
}, { timestamps: true });

const TwilioChat = mongoose.model('twiliochat', twilioChatSchema);

module.exports = TwilioChat;