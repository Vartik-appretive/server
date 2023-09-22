const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const blockSchema = new Schema({
	blockedUser: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'user'
	},
	blockedBy: {
		type: mongoose.Types.ObjectId,
		required: true,
		index: true,
		ref: 'user'
	},
	blockedUser_blockedBy: {
		type: String,
		required: true,
		unique: true
	}
}, { timestamps: true });

const Block = mongoose.model('block', blockSchema);

module.exports = Block;

/**********
 * 
 * blockedBy is id of astrologer and blockedUser is id of user who got blocked
 * 
***********/