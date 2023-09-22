const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const filterSchema = new Schema({
	type: {
		type: String,
		required: true,
		index: true
	},
	name: {
		type: String,
		lowercase: true,
		required: true,
	},
	icon: {
		type: String,
		default: ''
	}
});

const Filters = mongoose.model('filter', filterSchema);

module.exports = Filters;