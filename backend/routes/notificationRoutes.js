/* ============================================================
   NOTIFICATION ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

/* Specific BEFORE :id */
router.get('/mark-all-read', ctrl.markAllRead);
router.post('/mark-all-read', ctrl.markAllRead);

router.get('/',           ctrl.list);
router.post('/:id/read',  ctrl.markRead);
router.delete('/:id',     ctrl.remove);

module.exports = router;