const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const walletSchema = new Schema({
	walletId: {
		type: String,
		required: true,
		unique: true
	},
	user: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: 'user',
		unique: true
	},
	mobile: {
		type: String,
		required: true,
		index: true
	},
	balance: {
		type: Number,
		required: true,
		get: v => Number(parseFloat(v).toFixed(2)),
		set: v => Number(parseFloat(v).toFixed(2))
	},
	bonus: {
		type: Number,
		default: 0
	}
}, { timestamps: true });

const Wallet = mongoose.model('wallet', walletSchema);

module.exports = Wallet;