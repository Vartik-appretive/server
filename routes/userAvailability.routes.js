const router = require('express').Router();

const { getUserAvailability, getUserAvailabilityById, addUserAvailability, updateUserAvailability, deleteUserAvailability } = require('../controllers/userAvailability.controller');
const { AdminAuthCheck, UserAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(UserAuthCheck, getUserAvailability)
	.post(UserAuthCheck, addUserAvailability);

router
	.route('/:id')
	.get(AdminAuthCheck, getUserAvailabilityById)
	.patch(AdminAuthCheck, updateUserAvailability)
	.delete(UserAuthCheck, deleteUserAvailability);

module.exports = router;