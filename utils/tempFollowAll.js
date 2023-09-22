/*
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
		unique: true,
		index: true
	}
}, { timestamps: true });
*/

const Follow = require("../models/follow.model");
const User = require("../models/users.model")

exports.tempFollow = async (id, astrologer) => {
	if(astrologer) {
		const normalUser = await User.find({role: 'user'});
		
		if(normalUser.length == 0) return;
		
		//const userFollowerId = `${user._id.toString()}-${astrologerId.toString()}`;

		const arrUF = normalUser.map(user => {
			const abc = { userId: user._id, followingId: id, userFollowerId: `${user._id.toString()}-${id.toString()}` }
			return abc;
		});

		const result = await Follow.insertMany(arrUF);
		
	} else {
		const astrologer = await User.find({role: 'astrologer'});

		const arrUF = astrologer.map(astro => {
			const abc = { userId: id, followingId: astro._id, userFollowerId: `${id._id.toString()}-${astro._id.toString()}` }
			return abc;
		});

		const result = await Follow.insertMany(arrUF);
	}
}