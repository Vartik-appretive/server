const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const favouriteSchema = new Schema({
	user: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: 'user'
	},
	astrologer: {
		type: mongoose.Types.ObjectId,
		required: true,
		ref: 'user'
	},
	uaid: {
		type: String,
		required: true,
		unique: true
	}
}, { timestamps: true });

const Favourite = mongoose.model('favourite', favouriteSchema);

module.exports = Favourite;