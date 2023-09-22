const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const gallerySchema  = new Schema({
    name: {
        type: String,
        required: true
    },
	slug: {
		type: String,
        required: true,
		unique: true
	},
    alt: {
        type: String,
        default: "",
    },
    url: {
        type: String,
        required: true
    }
});

const Gallery = mongoose.model('gallery', gallerySchema);

module.exports = Gallery;