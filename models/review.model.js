const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const reviewSchema = new Schema({
	umid: {
		type: String,
        trim: true,
		required: true,
        unique: true
	},
	rating: {
		type: Number,
		require: true,
		max: 5
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'user',
		require: true
	},
	astrologer: {
		type: Schema.Types.ObjectId,
		ref: 'user',
		require: true
	},
	comment: {
		type: String,
		default: ''
	},
	choiceText: {
		type: [String],
		default: []
	},
	meeting: {
		type: Schema.Types.ObjectId,
		ref: 'meeting',
		require: true
	}
}, { timestamps: true });

const Review = mongoose.model('review', reviewSchema);

module.exports = Review;