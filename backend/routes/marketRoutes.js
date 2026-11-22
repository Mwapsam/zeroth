/* ============================================================
   MARKET ROUTES
   ------------------------------------------------------------
   The frontend sends `{ type: 'shop' | 'product' | 'order' }`.
   `/api/market` (no subpath) is handled by the controller's
   `list` / `create` dispatchers.
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/marketController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

/* Dispatcher (GET/POST /api/market?type=...) */
router.get('/',  ctrl.list);
router.post('/', optionalAuth, ctrl.create);

/* ---- Shops ---- */
/* mine BEFORE :id */
router.get('/shops/mine',    requireAuth, ctrl.myShops);
router.get('/shops',         ctrl.listShops);
router.get('/shops/:id',     ctrl.getShop);

router.post('/shops',
    requireAuth, requireRole('vendor', 'admin'),
    ctrl.createShop);

router.patch('/shops/:id',
    requireAuth, requireRole('vendor', 'admin'),
    ctrl.updateShop);

router.delete('/shops/:id',
    requireAuth, requireRole('vendor', 'admin'),
    ctrl.deleteShop);

/* Vendor registration */
router.post('/vendor/register', ctrl.vendorRegister);

/* ---- Orders ---- */
router.post('/orders',       optionalAuth, ctrl.createOrder);
router.get('/orders/mine',   requireAuth,  ctrl.listMyOrders);
router.get('/orders/:id',    requireAuth,  ctrl.getOrder);
router.patch('/orders/:id/status',
    requireAuth, requireRole('admin', 'vendor'),
    ctrl.updateOrderStatus);

module.exports = router;