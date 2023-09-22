const router = require("express").Router();
const { addDoc, getDocs, updateDoc, deleteDoc } = require("../controllers/review.controller");
const { UserAuthCheck, RestrictTo } = require("../middleware/auth.middleware");

router
	.route('/')
	.get(UserAuthCheck, getDocs)
	.post(UserAuthCheck, RestrictTo('user'), addDoc);

router
	.route('/:id')
	.patch(UserAuthCheck, RestrictTo('user', 'astrologer'), updateDoc)
	.delete(UserAuthCheck, RestrictTo('user', 'astrologer'), deleteDoc);

module.exports = router;