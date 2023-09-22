const router = require('express').Router();

const { getBlockedUser, unblockUser, blockUser, isBlocked } = require('../controllers/block.controller');
const { UserAuthCheck,  RestrictTo } = require('../middleware/auth.middleware');

router
	.route('/list')
	.get(UserAuthCheck, RestrictTo('astrologer'), getBlockedUser);

router
	.route('/is-blocked')
	.post(UserAuthCheck, RestrictTo('astrologer'), isBlocked);

router
	.route('/add')
	.post(UserAuthCheck, RestrictTo('astrologer'), blockUser);

router
	.route('/remove')
	.post(UserAuthCheck, RestrictTo('astrologer'), unblockUser);

module.exports = router;