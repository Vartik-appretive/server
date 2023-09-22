const { sendNotification, getNotifications, subscribeToAstrologer, unsubscribeToAstrologer } = require('../controllers/notification.controller');
const { AdminAuthCheck, UserAuthCheck } = require('../middleware/auth.middleware');

const router = require('express').Router();

router
	.route('/')
	.get(AdminAuthCheck, getNotifications);

router
	.route('/send')
	.post(AdminAuthCheck, sendNotification);

router
	.route('/subscribe/astrologer')
	.get(UserAuthCheck, subscribeToAstrologer);

router
	.route('/unsubscribe/astrologer')
	.get(UserAuthCheck, unsubscribeToAstrologer);

module.exports = router;