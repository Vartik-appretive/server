const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const notificationSchema = new Schema({
	title: {
		type: String,
		required: [true, "Notification title is required"]
	},
	description: {
		type: String,
		default: ''
	},
	image: {
		type: String,
		default: ''
	}
}, { timestamps: true });

const Notification = mongoose.model('notification', notificationSchema);

module.exports = Notification;