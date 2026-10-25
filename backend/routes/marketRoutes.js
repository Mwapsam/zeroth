const router = require('express').Router();
const ctrl = require('../controllers/marketController');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');

router.get('/shops', ctrl.listShops);
router.get('/shops/mine', protect, ctrl.myShops);
router.get('/shops/:id', ctrl.getShop);
router.post('/shops', protect, restrictTo('vendor', 'admin'), ctrl.createShop);
router.patch('/shops/:id', protect, restrictTo('vendor', 'admin'), ctrl.updateShop);
router.delete('/shops/:id', protect, restrictTo('vendor', 'admin'), ctrl.deleteShop);

router.post('/vendor/register', ctrl.vendorRegister);

router.post('/orders', optionalAuth, ctrl.createOrder);
router.get('/orders/mine', protect, ctrl.listMyOrders);
router.get('/orders/:id', protect, ctrl.getOrder);
router.patch('/orders/:id/status', protect, restrictTo('admin', 'vendor'), ctrl.updateOrderStatus);

module.exports = router;