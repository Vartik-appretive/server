const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const blogSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	featuredImage: {
		type: String,
		default: ""
	},
	description: {
		type: String,
		required: true
	},
	content: {
		type: String,
		required: true
	},
	author: {
		type: mongoose.Types.ObjectId,
		default: '62d94d258f56a270a0ee7dd6',
		ref: 'user'
	}
}, { timestamps: true });

const Blog = mongoose.model('blog', blogSchema);

module.exports = Blog;