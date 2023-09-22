const router = require('express').Router();

const { addFavouriteAstrologer, removeFavouriteAstrologer, getFavouriteOrNot } = require('../controllers/favourite.controller');
const { UserAuthCheck, RestrictTo } = require('../middleware/auth.middleware');

// router
// 	.route('/')
// 	.get(UserAuthCheck, getUserLikes);

router
	.route('/add')
	.post(UserAuthCheck, RestrictTo('user'), addFavouriteAstrologer);

router
	.route('/remove')
	.post(UserAuthCheck, RestrictTo('user'), removeFavouriteAstrologer);

router
	.route('/is-favourite')
	.post(UserAuthCheck, RestrictTo('user'), getFavouriteOrNot);

module.exports = router;