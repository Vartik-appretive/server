const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userAvailableSchema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'user',
		required: true
	},
	date: {
		type: Date,
		required: true
	}
});

const UserAvailability = mongoose.model('useravailability', userAvailableSchema);

module.exports = UserAvailability;