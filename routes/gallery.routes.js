const router = require("express").Router();
const { getImages, uploadImage, deleteImage } = require("../controllers/gallery.controller");
const { AdminAuthCheck } = require("../middleware/auth.middleware");

router
	.route('/')
	.get(getImages)
	.post(AdminAuthCheck, uploadImage);

router
	.route('/:slug')
	.delete(AdminAuthCheck, deleteImage);

module.exports = router;