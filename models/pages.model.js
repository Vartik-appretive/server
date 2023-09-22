const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const pagesSchema = new Schema({
	screen: {
		type: String,
		require: true,
		unique: true,
	},
	data: {
		type: Object,
		required: true
	}
}, {timestamps: true});

const Page = mongoose.model('page', pagesSchema);

module.exports = Page;