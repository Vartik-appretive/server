const router = require('express').Router();
const { getPooja, addPooja, deletePooja, updatePooja, getPoojaById, searchPooja, bookPooja, getUserBookedPooja, getPoojaOrders, updatePoojaOrderById } = require('../controllers/pooja.controller');
const { AdminAuthCheck, UserAuthCheck, RestrictTo } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(UserAuthCheck, RestrictTo('user'), getPooja)
	.post(AdminAuthCheck, addPooja);

router
	.route('/admin')
	.get(AdminAuthCheck, getPooja);

	router
	.route('/admin/:id')
	.get(AdminAuthCheck, getPoojaById);

router
	.route('/search')
	.get(UserAuthCheck, RestrictTo('user'), searchPooja);

router
	.route('/book')
	.post(UserAuthCheck, RestrictTo('user'), bookPooja);

router
	.route('/orders')
	.get(AdminAuthCheck, getPoojaOrders);

router
	.route('/my-orders')
	.get(UserAuthCheck, RestrictTo('user'), getUserBookedPooja);

router
	.route('/user-orders/:id')
	.get(AdminAuthCheck, getUserBookedPooja)
	.patch(AdminAuthCheck, updatePoojaOrderById);

router
	.route('/:id')
	.get(UserAuthCheck, RestrictTo('user'), getPoojaById)
	.patch(AdminAuthCheck, updatePooja)
	.delete(AdminAuthCheck, deletePooja);

module.exports = router;