const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const giftSchema = new Schema({
	name: {
		type: String,
		required: true,
		default: ''
	},
	image: {
		type: String,
		required: true
	},
	price: {
		type: Number,
        required: true
	},
	deleted: {
		type: Object,
		default: { trash: false },
		select: false
	}
}, { timestamps: true });

const Gift = mongoose.model('gift', giftSchema);

module.exports = Gift;