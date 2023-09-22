const mongoose = require('mongoose');
const constants = require('../config/constants');

const Schema = mongoose.Schema;

const meetingSchema = new Schema({
	status: {
		type: String,
		required: true,
		enum: ['ongoing', 'declined', 'ended', 'pending', 'missed']
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
	call: {
		id: {
			type: String,
			required: true
		},
		roomId: {
			type: String,
			required: true,
			index: true
		},
		customRoomId: {
			type: String,
			required: true,
			unique: true
		},
		sessionId: {
			type: String,
			index: true,
			select: false
		},
		type: {
			type: String,
			required: true,
			enum: [constants.app_voice_call.key, constants.app_video_call.key, constants.mobile_call.key, constants.app_messaging.key, constants.sos_call.key, constants.app_live_stream.key]
		},
		participants: {
			type: Number,
			default: 0,
			select: false
		}
	},
	user: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'user'
	},
	astrologer: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'user'
	},
	rating: {
		type: Number,
		required: true,
		default: 0
	},
	transactionU: {
		type: mongoose.Types.ObjectId,
		ref: 'transaction'
	},
	transactionA: {
		type: mongoose.Types.ObjectId,
		ref: 'transaction'
	},
	other: {
		type: Object,
		select: false
	}
}, { timestamps: true, toJSON: { virtuals: true } });

meetingSchema.virtual('review', {
	ref: 'review',
	localField: '_id',
	foreignField: 'meeting'
});

const VideoSDKMeeting = mongoose.model('meeting', meetingSchema);

module.exports = VideoSDKMeeting;