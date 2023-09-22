const router = require('express').Router();

const { getFollowerOfUser, getFollowingOfUser, followAstrologer, unfollowAstrologer, getFollowingOrNot } = require('../controllers/follow.controller');
const { UserAuthCheck, RestrictTo } = require('../middleware/auth.middleware');

router
	.route('/followers')
	.get(UserAuthCheck, getFollowerOfUser);

router
	.route('/following')
	.get(UserAuthCheck, getFollowingOfUser);

router
	.route('/i-follow')
	.post(UserAuthCheck, RestrictTo('user'), getFollowingOrNot);

router
	.route('/add')
	.post(UserAuthCheck, RestrictTo('user'), followAstrologer);

router
	.route('/remove')
	.post(UserAuthCheck, RestrictTo('user'), unfollowAstrologer);

module.exports = router;