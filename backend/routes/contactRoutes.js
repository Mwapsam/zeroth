const router = require('express').Router();
const ctrl = require('../controllers/contactController');
const { protect, restrictTo } = require('../middleware/auth');
const { contactRules, validate } = require('../utils/validators');

router.post('/', contactRules, validate, ctrl.create);
router.get('/', protect, restrictTo('admin'), ctrl.list);
router.patch('/:id/status', protect, restrictTo('admin'), ctrl.updateStatus);
router.delete('/:id', protect, restrictTo('admin'), ctrl.remove);

module.exports = router;