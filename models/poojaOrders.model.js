const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const poojaOrdersSchema = new Schema({
	status: {
		type: String,
		default: 'pending',
		enum: ['pending', 'accepted', 'rejected', 'completed']
	},
	pooja: {
		type: mongoose.Types.ObjectId,
		ref: 'pooja',
		required: true
	},
	plan: {
		type: String,
		required: true
	},
	price: {
		type: Number,
		required: true
	},
	date: {
		type: Date,
		required: true
	},
	poojaSlot: {
		type: mongoose.Types.ObjectId,
		ref: 'poojaslots',
		required: true
	},
	slot: {
		type: mongoose.Types.ObjectId,
		required: true
	},
	user: {
		type: mongoose.Types.ObjectId,
		ref: 'user',
		required: true,
		index: true
	},
	transaction: {
		type: mongoose.Types.ObjectId,
		ref: 'transaction',
		required: true
	}
}, { timestamps: true });

const PoojaOrders = mongoose.model('poojaorders', poojaOrdersSchema);

module.exports = PoojaOrders;