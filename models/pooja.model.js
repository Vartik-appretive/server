const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const poojaPlanSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
        },
        title: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        price: Number,
        popularTag: Boolean,
    },
    { _id: false }
);

const poojaFaqSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
        },
        question: String,
        answer: String,
    },
    { _id: false }
);

const templeTimeSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
        },
        open: String,
        close: String,
    },
    { _id: false }
);

const poojaSchema = new Schema(
    {
        title: {
            type: String,
            require: true,
            index: true,
        },
        templeName: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            default: "published",
        },
        featuredImage: {
            type: String,
            required: true,
        },
        backgroundImage: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            default: "#FE9D0B",
        },
        description: {
            type: String,
            required: true,
        },
        content: String,
        video: String,
        duration: {
            type: Number,
        },
        minPrice: Number,
        plans: [poojaPlanSchema],
        faq: [poojaFaqSchema],
        templeGallery: [String],
        templeTime: [templeTimeSchema],
    },
    { timestamps: true }
);

poojaSchema.index({ title: "text" });

const Pooja = mongoose.model("pooja", poojaSchema);

module.exports = Pooja;
