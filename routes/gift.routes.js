const router = require('express').Router();

const { getGifts, getGiftById, addGift, updateGift, deleteGift, sendGift } = require('../controllers/gift.controller');
const { AdminAuthCheck, UserAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(getGifts)
	.post(AdminAuthCheck, addGift);

router
    .route('/send')
	.post(UserAuthCheck, sendGift)

router
	.route('/:id')
	.get(AdminAuthCheck, getGiftById)
	.patch(AdminAuthCheck, updateGift)
	.delete(AdminAuthCheck, deleteGift);

module.exports = router;