const router = require('express').Router();

const { getContacts, getContactById, sendContact, updateContact, deleteContact } = require('../controllers/contact.controller');
const { AdminAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/')
	.get(AdminAuthCheck, getContacts)
	.post(sendContact);

router
	.route('/:id')
	.get(AdminAuthCheck, getContactById)
	.patch(AdminAuthCheck, updateContact)
	.delete(AdminAuthCheck, deleteContact);

module.exports = router;