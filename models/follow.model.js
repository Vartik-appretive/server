const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const followSchema = new Schema({
	userId: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true
	},
	followingId: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true
	},
	userFollowerId: {
		type: String,
		required: true,
		unique: true
	}
}, { timestamps: true });

const Follow = mongoose.model('follow', followSchema);

module.exports = Follow;

/**********
 * 
 * followingid is id of astrologer and userId is id of user that follows user
 * 
***********/