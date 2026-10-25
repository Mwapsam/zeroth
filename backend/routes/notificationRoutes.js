const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.list);
router.post('/:id/read', ctrl.markRead);
router.post('/mark-all-read', ctrl.markAllRead);
router.delete('/:id', ctrl.remove);

module.exports = router;