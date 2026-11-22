/* ============================================================
   PAYMENT ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

/* Specific BEFORE :id */
router.get('/mine',    ctrl.listMine);
router.get('/wallet',  ctrl.wallet);

router.post('/',       ctrl.create);
router.get('/:id',     ctrl.getOne);
router.post('/:id/refund',
    requireRole('admin'),
    ctrl.refund);

module.exports = router;