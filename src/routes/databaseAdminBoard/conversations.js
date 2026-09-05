const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/conversationsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllConversations);
router.get('/:id', controller.getConversationById);
router.post('/', controller.createConversation);
router.put('/:id', controller.updateConversation);
router.delete('/:id', controller.deleteConversation);

module.exports = router;
