const router = require('express').Router();

const { getFilters, getFilterById, updateFilter, deleteFilter, createFilter, getFilterByType } = require('../controllers/filter.controller');
const { AdminAuthCheck, UserAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(getFilters)
	.post(AdminAuthCheck, createFilter);

router
	.route('/type/:type')
	.get(AdminAuthCheck, getFilterByType);

router
	.route('/:id')
	.get(AdminAuthCheck, getFilterById)
	.patch(AdminAuthCheck, updateFilter)
	.delete(AdminAuthCheck, deleteFilter);

module.exports = router;