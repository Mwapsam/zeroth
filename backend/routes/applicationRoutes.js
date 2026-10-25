const router = require('express').Router();
const ctrl = require('../controllers/applicationController');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const { applicationRules, validate } = require('../utils/validators');

router.post('/', optionalAuth, applicationRules, validate, ctrl.create);
router.get('/mine', optionalAuth, ctrl.listMine);
router.get('/', protect, restrictTo('admin'), ctrl.listAll);
router.get('/:id', protect, ctrl.getOne);
router.patch('/:id/status', protect, restrictTo('admin'), ctrl.updateStatus);

module.exports = router;