const router = require('express').Router();

const { addAstroQuery, updateAstroQuery, deleteAstroQuery, getAstroQueryByUserId, getAstroQuery } = require('../controllers/astroQuery.controller');
const { AdminAuthCheck, UserAuthCheck, RestrictTo } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(UserAuthCheck, RestrictTo('user'), getAstroQuery)
	.post(UserAuthCheck, RestrictTo('user'), addAstroQuery);

router
	.route('/:id')
	.get(AdminAuthCheck, getAstroQueryByUserId)
	.patch(UserAuthCheck, updateAstroQuery)
	.delete(UserAuthCheck, deleteAstroQuery);

module.exports = router;