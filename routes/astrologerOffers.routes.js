const router = require('express').Router();

const { getAstrologerOffers, getAstrologerOfferById, addAstrologerOffer, updateAstrologerOffer, deleteAstrologerOffer } = require('../controllers/astrologerOffers.controller');
const { AdminAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(AdminAuthCheck, getAstrologerOffers)
	.post(AdminAuthCheck, addAstrologerOffer);

router
	.route('/:id')
	.get(AdminAuthCheck, getAstrologerOfferById)
	.patch(AdminAuthCheck, updateAstrologerOffer)
	.delete(AdminAuthCheck, deleteAstrologerOffer);

module.exports = router;