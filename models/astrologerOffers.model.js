const mongoose = require('mongoose');
const constants = require('../config/constants');

const Schema = mongoose.Schema;

const astrologerOffersSchema = new Schema({
	status: {
		type: String,
		required: true,
		enum: ['draft', 'live', 'trash'],
		lowecase: true
	},
	type: {
		type: String,
		required: true,
		enum: [constants.free_mins.key, constants.low_charges.key, constants.limited_low_charges.key]
	},
	freeMins: {
		type: Number,
		required: function () {
			return this.type === constants.free_mins.key
		}
	},
	lowCharges: {
		type: Number,
		required: function () {
			return this.type === constants.low_charges.key
		}
	},
	limitedLowCharges: {
		charges: {
			type: Number,
			required: function () {
				return this.type === constants.limited_low_charges.key
			}
		},
		mins: {
			type: Number,
			required: function () {
				return this.type === constants.limited_low_charges.key
			}
		}
	},
	deleted: {
		type: Object,
		default: { trash: false },
		select: false
	}
}, { timestamps: true });

const AstrologerOffers = mongoose.model('astrologeroffers', astrologerOffersSchema);

module.exports = AstrologerOffers;