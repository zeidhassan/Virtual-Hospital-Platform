const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/messages/messagesController');
const verifyToken = require('../../middleware/verifyToken');
const { uploadAttachment, wrapUpload } = require('../../middleware/uploadMiddleware');

router.use(verifyToken);

router.post('/conversations',                          ctrl.createConversation);
router.get('/conversations',                           ctrl.getConversations);
router.get('/conversations/:id/messages',              ctrl.getMessages);
router.post('/conversations/:id/messages', wrapUpload(uploadAttachment, 'attachment'), ctrl.sendMessage);
router.put('/conversations/:id/read',                  ctrl.markAsRead);
router.put('/conversations/:id/unread',                ctrl.markAsUnread);
router.put('/conversations/:id/pin',                   ctrl.setPinned);
router.post('/conversations/:id/participants',         ctrl.addParticipants);
router.delete('/conversations/:id/participants/:userId', ctrl.removeParticipant);
router.get('/contacts',                                ctrl.getAvailableContacts);
router.get('/unread-count',                            ctrl.getUnreadCount);

module.exports = router;
