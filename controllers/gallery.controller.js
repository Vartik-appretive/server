require("dotenv").config();
const fs = require("fs/promises");
const multer = require("multer");
const path = require("path");
const _ = require("lodash");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Gallery = require("../models/gallery.model");

const imageKeyName = "pn-images";

const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __dirname + "./../public/img");
    },
    filename: async (req, file, cb) => {
        let extension = path.extname(file.originalname);

        // let extension = file.originalname.split('0');
        // extension = extension[extension.length - 1];

        let uniqueName = `${new Date().getTime().toString()}-${_.kebabCase(file.originalname)}${extension}`;
        cb(null, uniqueName);
    },
});

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new AppError("Not an image! Please upload only images.", 400), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
}).fields([{ name: imageKeyName, maxCount: 12 }]);

// const upload = multer({ storage: photoEngine }).array(imageKeyName, 12);

exports.uploadImage = catchAsync(async (req, res, next) => {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.field !== imageKeyName) return next(new AppError("Invalid field name.", 406));
            if (err.code === "LIMIT_UNEXPECTED_FILE") return next(new AppError("File upload limit reached. Max upload limit is 12", 400));
            return next(new AppError("Internal error.", 500));
        } else if (err) {
            // An unknown error occurred when uploading.
            return next(new AppError("Unknow error occur. Please try again.", 500));
        }

        if (!req.files) return next(new AppError("No Images to process.", 406));

        // console.log(req.files);
        // Everything went fine.
        const imagesInfoData = req.files[imageKeyName]?.map((image) => {
            return { name: image.originalname, slug: image.filename, url: `/public/img/${image.filename}` };
        });

        if (!imagesInfoData) return next(new AppError("No Images to process.", 406));
        if (imagesInfoData?.length < 1) return next(new AppError("No Images to process.", 406));

        const gallery = await Gallery.insertMany(imagesInfoData);

        res.json({
            status: "success",
            message: "Photos added successfully.",
            result: gallery,
        });
    });
});

exports.getImages = catchAsync(async (req, res, next) => {
    let find = {};
    if (req.query.id) find._id = req.query.id;
    if (req.query.url) find.url = req.query.url;
    if (req.query.name) find.name = req.query.name;
    let page = req.query.page || 1;
    page = parseInt(page);
    let queryLimit = req.query.limit;

    const limit = queryLimit || 10;

    const startIndex = (Number(page) - 1) * limit;

    const total = await Gallery.countDocuments({});
    const gallery = await Gallery.find(find).skip(startIndex).limit(limit).sort({ _id: -1 });
    const totalPages = Math.ceil(total / limit);

    res.json({
        status: "success",
        message: `${total} Photos found.`,
        curPage: page,
        totalPages,
        result: gallery,
    });
});

exports.deleteImage = catchAsync(async (req, res, next) => {
    const { slug } = req.params;

    if (!slug) return next(new AppError("Document name is required"));

    const gallery = await Gallery.findOneAndDelete({ slug });
    if (!gallery) return next(new AppError(`Document not found with name: ${slug}`));

    await fs.unlink(`public/img/${slug}`);

    res.json({
        status: "success",
        message: "image successfully deleted.",
        result: gallery,
    });
});
