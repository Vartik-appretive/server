const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const profileSchema = new Schema({
	name: {
        type: String,
        trim: true,
		required: true,
	},
	gender: {
		type: String,
        trim: true,
		lowercase: true
	},
	dob: {
		type: String,
		default: ''
	},
	tob: {
		type: String,
        default: ''
	},
	pob: {
		type: String,
        default: '',
		lowercase: true
	},
	lat: {
		type: String,
		default: ''
	},
	long: {
        type: String,
        default: ''
	}
});

const astroQuerySchema = new Schema({
	user: {
		type: mongoose.Types.ObjectId,
		required: true,
		unique: true
	},
	profileOne: {
		type: [profileSchema],
		default: []
	},
	profileTwo: {
		type: [profileSchema],
		default: []
	}
}, { timestamps: true });

const AstroQuery = mongoose.model('astroquery', astroQuerySchema);

module.exports = AstroQuery;