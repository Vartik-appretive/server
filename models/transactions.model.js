const mongoose = require('mongoose');
const constants = require('../config/constants');

const refs = [constants.app_voice_call.key, constants.app_video_call.key, constants.mobile_call.key, constants.app_messaging.key, constants.gift.key, constants.app_live_stream.key];
const Schema = mongoose.Schema;

const transactionsSchema = new Schema({
	status: {
		type: String,
		required: true
	},
	// uoid: {
	// 	type: String,
	// 	required: true,
	// 	unique: true
	// },
	meeting: {
		type: mongoose.Types.ObjectId,
		ref: 'meeting'
	},
	pooja: {
		type: mongoose.Types.ObjectId,
		ref: 'poojaorders'
	},
	livestream: {
		type: mongoose.Types.ObjectId,
		ref: 'livestream'
	},
	amount: {
		type: Number,
		required: true,
		// get: v => Number(parseFloat(v).toFixed(2)),
		set: v => Number(parseFloat(v).toFixed(2))
	},
	plateformCharges: {
		type: Number,
		// get: v => Number(parseFloat(v).toFixed(2)),
		set: v => Number(parseFloat(v).toFixed(2))
	},
	type: {
		type: String,
		enum: ['deposit', 'withdraw']
	},
	currency: {
		type: String,
		required: true,
		default: 'INR'
	},
	orderId: {
		type: String,
		unique: true
	},
	txnId: {
		type: String,
		default: '',
		// unique: true
	},
	bankTxnId: {
		type: String,
		default: '',
		// unique: true
	},
	tnxTimestamp: {
		type: Number,
		required: true
	},
	ref: {
		type: String,
		enum: [...refs, 'anonymous', 'wallet', 'bonus', 'referred', 'pooja', 'offer'],
		default: 'anonymous'
	},
	user: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'user'
	},
	fromUser: {
		type: mongoose.Types.ObjectId,
		ref: 'user'
	},
	toUser: {
		type: mongoose.Types.ObjectId,
		ref: 'user'
	},
	mobile: {
		type: String,
		required: true
	},
	offer: {
		type: mongoose.Types.ObjectId
	},
	other: {
		type: Object,
		default: {}
	}
}, { timestamps: true });

const Transaction = mongoose.model('transaction', transactionsSchema);

module.exports = Transaction;