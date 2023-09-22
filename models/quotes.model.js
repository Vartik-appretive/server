const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const quoteSchema = new Schema({
	title: {
		type: String,
		require: true
	}
}, {timestamps: true});

const Quote = mongoose.model('quote', quoteSchema);

module.exports = Quote;