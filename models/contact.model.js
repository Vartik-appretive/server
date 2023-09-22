const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const contactSchema = new Schema({
	name: {
		type: String,
		required: true,
		default: ''
	},
	email: {
		type: String,
		required: true
	},
	subject: {
		type: String,
        required: true
	},
	message: {
		type: String,
        required: true
	},
	seen: {
		type: Boolean,
        default: false
	},
	deleted: {
		type: Object,
		default: { trash: false },
		select: false
	}
}, { timestamps: true });

const Contact = mongoose.model('contact', contactSchema);

module.exports = Contact;