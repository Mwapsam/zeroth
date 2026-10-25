const router = require('express').Router();
const ctrl = require('../controllers/socialController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/accounts', ctrl.listAccounts);
router.post('/accounts', ctrl.connectAccount);
router.delete('/accounts/:id', ctrl.disconnectAccount);
router.get('/inbox', ctrl.listInbox);
router.post('/inbox/:id/read', ctrl.markRead);
router.post('/inbox/mark-all-read', ctrl.markAllRead);
router.post('/broadcast', ctrl.broadcast);

module.exports = router;