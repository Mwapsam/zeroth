const router = require('express').Router();
const ctrl = require('../controllers/advertController');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', optionalAuth, ctrl.create);
router.get('/mine', protect, ctrl.mine);
router.post('/:id/impression', ctrl.trackImpression);
router.post('/:id/click', ctrl.trackClick);
router.patch('/:id/status', protect, restrictTo('admin'), ctrl.updateStatus);

module.exports = router;