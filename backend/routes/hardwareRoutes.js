const router = require('express').Router();
const ctrl = require('../controllers/hardwareController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', ctrl.list);
router.get('/mine', protect, ctrl.listMine);
router.get('/:id', ctrl.getOne);
router.post('/', protect, restrictTo('vendor', 'admin'), ctrl.create);
router.patch('/:id', protect, restrictTo('vendor', 'admin'), ctrl.update);
router.delete('/:id', protect, restrictTo('vendor', 'admin'), ctrl.remove);

module.exports = router;