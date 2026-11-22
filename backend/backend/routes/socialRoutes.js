/* ============================================================
   SOCIAL ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/socialController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/* ---- Accounts ---- */
router.get('/accounts',        ctrl.listAccounts);
router.post('/accounts',       ctrl.connectAccount);
router.delete('/accounts/:id', ctrl.disconnectAccount);

/* ---- Inbox ---- */
/* mark-all-read BEFORE :id */
router.post('/inbox/mark-all-read', ctrl.markAllRead);
router.get('/inbox',                ctrl.listInbox);
router.post('/inbox/:id/read',      ctrl.markRead);

/* ---- Broadcast ---- */
router.post('/broadcast', ctrl.broadcast);

module.exports = router;