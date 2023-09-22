const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const paymentOffersSchema = new Schema({
	status: {
		type: String,
		required: true,
		enum: ['draft', 'live', 'trash'],
		lowecase: true
	},
	payingAmount: {
		type: String,
		required: true,
		set: function (value) {
			return Number(value).toFixed(2)
		}
	},
	offerAmount: {
		type: String,
		required: true,
		set: function (value) {
			return Number(value).toFixed(2)
		},
		validate: [
			function (value) {
				return value > this.payingAmount;
			},
			'offer amount must be more than paying amount'
		]
	}
}, { timestamps: true });

const PaymentOffer = mongoose.model('paymentOffers', paymentOffersSchema);

module.exports = PaymentOffer;