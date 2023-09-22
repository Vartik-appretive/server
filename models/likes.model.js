const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const likeSchema = new Schema({
	userId: {
		type: mongoose.Types.ObjectId,
		required: true
	},
	likedId: {
		type: mongoose.Types.ObjectId,
		required: true
	},
	userLikedId: {
		type: String,
		required: true,
		unique: true
	}
}, {timestamps: true});

const Like = mongoose.model('like', likeSchema);

module.exports = Like;

/*
* LikedId is id of astrologer who is being liked
*/