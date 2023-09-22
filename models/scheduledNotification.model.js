const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const scheduledNotificationSchema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		required: true
	},
	astrologer: {
		type: Schema.Types.ObjectId,
		required: true
	}
}, { timestamps: true });

const ScheduledNotification = mongoose.model('schedulednotification', scheduledNotificationSchema);

module.exports = ScheduledNotification;