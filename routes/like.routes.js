const router = require('express').Router();

const { getUserLikes, likeAstrologer, dislikeAstrologer, getLikeOrNot } = require('../controllers/like.controller');
const { UserAuthCheck, RestrictTo } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(UserAuthCheck, getUserLikes);

router
	.route('/add')
	.post(UserAuthCheck, RestrictTo('user'), likeAstrologer);

router
	.route('/remove')
	.post(UserAuthCheck, RestrictTo('user'), dislikeAstrologer);

router
	.route('/i-like')
	.post(UserAuthCheck, RestrictTo('user'), getLikeOrNot);

module.exports = router;