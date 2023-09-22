const mongoose = require('mongoose');
const constants = require('../config/constants');

const calls = [constants.app_voice_call.key, constants.app_video_call.key];
const Schema = mongoose.Schema;

const orderSchema = new Schema({
	status: {
		type: String,
		required: true,
		enum: ['pending', 'ongoing', 'declined', 'ended']
	},
	type: {
		type: String,
		required: true,
		enum: [...calls, constants.mobile_call.key, constants.app_messaging.key]
	},
	appCall: {
		id: {
			type: String,
			required: function () {
				return calls.includes(this.type);
			}
		},
		roomId: {
			type: String,
			required: function () {
				return calls.includes(this.type);
			},
			index: true
		},
		customRoomId: {
			type: String,
			required: function () {
				return calls.includes(this.type);
			},
			index: true
		},
		sessionId: {
			type: String,
			index: true,
			select: false
		}
	},
	mobileCall: {
		type: Object,
		required: function () {
			return constants.mobile_call.key === this.type;
		}
	},
	user: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'users'
	},
	astrologer: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'users'
	},
	startedAt: {
		type: Date
	},
	endedAt: {
		type: Date
	},
	duration: {
		type: String,
		default: ''
	},
	transaction: {
		type: mongoose.Types.ObjectId,
		ref: 'transactions'
	}
}, { timestamps: true });

const Order = mongoose.model('order', orderSchema);


module.exports = Order;