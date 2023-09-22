const router = require('express').Router();

const { getAstroAdminCommunications, addAstroAdminCommunication, getAstroAdminCommunicationById, updateAstroAdminCommunication, deleteAstroAdminCommunication } = require('../controllers/astroAdminCommunication.controller');
const { AdminAuthCheck, UserAuthCheck, RestrictTo } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(UserAuthCheck, RestrictTo('astrologer'), getAstroAdminCommunications)
	.post(AdminAuthCheck, addAstroAdminCommunication);

router
	.route('/admin')
	.get(AdminAuthCheck, getAstroAdminCommunications);

router
	.route('/:id')
	.get(UserAuthCheck,  RestrictTo('astrologer'), getAstroAdminCommunicationById)
	.patch(AdminAuthCheck, updateAstroAdminCommunication)
	.delete(AdminAuthCheck, deleteAstroAdminCommunication);

module.exports = router;