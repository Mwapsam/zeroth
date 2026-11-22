/* ============================================================
   ADVERT ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/advertController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

/* Public browsing */
router.get('/', ctrl.list);

/* Post — guests allowed (ads are submitted under a guest session) */
router.post('/', optionalAuth, ctrl.create);

/* Mine — auth */
router.get('/mine', requireAuth, ctrl.mine);

/* Impression / click tracking (public) */
router.post('/:id/impression', ctrl.trackImpression);
router.post('/:id/click',      ctrl.trackClick);

/* Admin moderation */
router.patch('/:id/status',
    requireAuth, requireRole('admin'),
    ctrl.updateStatus);

module.exports = router;