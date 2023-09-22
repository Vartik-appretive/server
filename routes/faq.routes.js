const router = require('express').Router();

const { getFaqs, addFaq, getFaqById, updateFaq, deleteFaq } = require('../controllers/faq.controller');
const { AdminAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(getFaqs)
	.post(AdminAuthCheck, addFaq);

router
	.route('/:id')
	.get(AdminAuthCheck, getFaqById)
	.patch(AdminAuthCheck, updateFaq)
	.delete(AdminAuthCheck, deleteFaq);

module.exports = router;