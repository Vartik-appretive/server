const router = require('express').Router();

const { getAstrologerLiveStream } = require('../controllers/meetings.controller');
const { getUsers, getUserById, getLiveVariables, createAstrologer, changeProfilePhoto, getAstrologer, getAstrologerById, addGalleyPhotos, updateUserById, getWallet, astrologerDashboardData, getEarnings, deleteUserById, getWalletById, getUserOrders, getAstrologerQueUser, uploadUserProfilePhoto, uploadUserGalleyPhotos } = require('../controllers/users.controller');
const { AdminAuthCheck, UserAuthCheck, RestrictTo, DynamicMiddleware } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(AdminAuthCheck, getUsers)
	.post(UserAuthCheck, changeProfilePhoto)
	.patch(AdminAuthCheck, updateUserById);

router
	.route('/astrologer')
	.get(DynamicMiddleware({ pass: true, key: 'bypassAuth' }), UserAuthCheck, getAstrologer)
	.post(AdminAuthCheck, createAstrologer);

router
	.route('/astrologer/live-vars')
	.get(AdminAuthCheck, getLiveVariables);

router
	.route('/astrologer/live-stream')
	.post(UserAuthCheck, getAstrologerLiveStream);

router
	.route('/astrologer/gallery')
	.post(UserAuthCheck, RestrictTo('astrologer'), addGalleyPhotos);

router
	.route('/astrologer/dashboard-data')
	.get(UserAuthCheck, RestrictTo('astrologer'), astrologerDashboardData);

router
	.route('/astrologer/earnings')
	.get(UserAuthCheck, RestrictTo('astrologer'), getEarnings);

router
	.route('/astrologer/que/:id')
	.get(UserAuthCheck, RestrictTo('astrologer'), getAstrologerQueUser);

router
	.route('/astrologer/:id')
	.get(UserAuthCheck, getAstrologerById);

router
	.route('/orders')
	.get(UserAuthCheck, getUserOrders);

router
	.route('/wallet')
	.get(UserAuthCheck, getWallet);

router
	.route('/wallet/:id')
	.get(AdminAuthCheck, getWalletById);

router
	.route('/profilePhoto')
	.post(AdminAuthCheck, uploadUserProfilePhoto);

router
	.route('/gallery')
	.post(AdminAuthCheck, uploadUserGalleyPhotos);

router
	.route('/:id')
	.get(AdminAuthCheck, getUserById)
	.delete(AdminAuthCheck, deleteUserById);

module.exports = router;