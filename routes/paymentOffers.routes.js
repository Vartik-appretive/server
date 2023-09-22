const router = require('express').Router();

const { getPaymentOffers, addPaymentOffers, updatePaymentOffers, deletePaymentOffers } = require('../controllers/paymentOffers.controller');
const { AdminAuthCheck, UserAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(AdminAuthCheck, getPaymentOffers)
	.post(AdminAuthCheck, addPaymentOffers);

router
	.route('/offers')
	.get(UserAuthCheck, getPaymentOffers);

router
	.route('/:id')
	.patch(AdminAuthCheck, updatePaymentOffers)
	.delete(AdminAuthCheck, deletePaymentOffers);

module.exports = router;