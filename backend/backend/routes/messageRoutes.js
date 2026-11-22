/* ============================================================
   MESSAGE ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

router.use(requireAuth);

/* Inbox */
router.get('/conversations', ctrl.listConversations);
router.get('/unread-count',  ctrl.unreadCount);

/* Global read-all (must come before /:otherId) */
router.post('/mark-all-read', ctrl.markAllRead);

/* Attachments */
router.post('/upload', uploadSingle('file'), ctrl.uploadAttachment);

/* Per-message read receipt */
router.post('/:id/read', ctrl.markRead);

/* Per-conversation history + send */
router.get('/:otherId',  ctrl.getConversation);
router.post('/:otherId', ctrl.send);

module.exports = router;