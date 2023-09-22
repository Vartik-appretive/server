const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const faqSchema = new Schema({
	question: {
		type: String,
		required: true,
		default: ''
	},
	answer: {
		type: String,
		required: true
	},
	index: {
		type: Number,
        required: true,
        default: 0
	}
}, { timestamps: true });

const Faq = mongoose.model('faq', faqSchema);

module.exports = Faq;