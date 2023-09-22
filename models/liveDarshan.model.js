const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const liveDarshanSchema = new Schema({
	location: {
		type: String,
		required: true
	},
	images: {
		type: [String],
		required: true
	}
}, {timestamps: true});

const LiveDarshan = mongoose.model('livedarshan', liveDarshanSchema);

module.exports = LiveDarshan;