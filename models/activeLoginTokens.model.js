const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const activeLoginTokenSchema = new Schema({
	token: {
		type: String,
		required: [true, 'email is required']
	},
	user: {
		type: Schema.Types.ObjectId,
        ref: 'user',
		required: [true, 'user is required']
	}
}, {timestamps: true});

const ActiveLoginToken = mongoose.model('activelogintoken', activeLoginTokenSchema);


module.exports = ActiveLoginToken;