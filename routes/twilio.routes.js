const router = require('express').Router();

const { generateChatToken, getConversations, getParticipantInConversation, createConversations, deleteConversation, createParticipant } = require('../controllers/twilio.controller');
const { AdminAuthCheck, UserAuthCheck } = require('../middleware/auth.middleware');

router
	.route('/token')
	.get(UserAuthCheck, generateChatToken);
	// .post(AdminAuthCheck, createFilter);

router
	.route('/conversations')
	.get(AdminAuthCheck, getConversations)
	.post(AdminAuthCheck, createConversations)
	.delete(AdminAuthCheck, deleteConversation);

router
    .route('/participant/:conversation')
	.get(AdminAuthCheck, getParticipantInConversation)
	.post(AdminAuthCheck, createParticipant);

// router
// 	.route('/:id')
// 	.get(getFilterById)
// 	// .post(AdminAuthCheck, addFilter)
// 	.patch(AdminAuthCheck, updateFilter)
// 	.delete(AdminAuthCheck, deleteFilter);

module.exports = router;