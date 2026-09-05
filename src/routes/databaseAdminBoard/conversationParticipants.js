const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/conversationParticipantsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllConversationParticipants);
router.get('/:id', controller.getConversationParticipantById);
router.post('/', controller.createConversationParticipant);
router.put('/:id', controller.updateConversationParticipant);
router.delete('/:id', controller.deleteConversationParticipant);

module.exports = router;
