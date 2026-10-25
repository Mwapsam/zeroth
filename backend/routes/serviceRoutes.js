const router = require('express').Router();
const ctrl = require('../controllers/serviceController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', protect, restrictTo('admin'), ctrl.create);
router.patch('/:id', protect, restrictTo('admin'), ctrl.update);
router.delete('/:id', protect, restrictTo('admin'), ctrl.remove);

module.exports = router;