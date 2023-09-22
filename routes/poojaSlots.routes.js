const router = require('express').Router();

const { getPoojaSlots, getPoojaSlotsById, addPoojaSlots, updatePoojaSlots, deletePoojaSlots, getPoojaSlotsByMonth } = require('../controllers/poojaSlots.controller');
const { AdminAuthCheck, UserAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(AdminAuthCheck, getPoojaSlots)
	.post(AdminAuthCheck, addPoojaSlots);

router
    .route('/month/:date')
	.get(UserAuthCheck, getPoojaSlotsByMonth)

router
	.route('/:id')
	.get(AdminAuthCheck, getPoojaSlotsById)
	.patch(AdminAuthCheck, updatePoojaSlots)
	.delete(AdminAuthCheck, deletePoojaSlots);

module.exports = router;