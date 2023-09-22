const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const astroAdminCommunicationSchema = new Schema({
	title: {
		type: String,
		required: [true, "Title is required."]
	},
	message: {
		type: String,
		required: [true, "Message is required."]
	}
}, { timestamps: true });

const AstroAdminCommunication = mongoose.model('astroadmincommunication', astroAdminCommunicationSchema);

module.exports = AstroAdminCommunication;