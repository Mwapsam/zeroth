const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.post('/', ctrl.create);
router.get('/mine', ctrl.listMine);
router.get('/wallet', ctrl.wallet);
router.get('/:id', ctrl.getOne);
router.post('/:id/refund', restrictTo('admin'), ctrl.refund);

module.exports = router;