/* ============================================================
   HARDWARE ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/hardwareController');
const { requireAuth, requireRole } = require('../middleware/auth');

/* Public list + read */
router.get('/',      ctrl.list);
router.get('/:id',   ctrl.getOne);

/* Vendor/admin-only management */
router.get('/mine',
    requireAuth,
    ctrl.listMine);

router.post('/',
    requireAuth, requireRole('vendor', 'admin'),
    ctrl.create);

router.patch('/:id',
    requireAuth, requireRole('vendor', 'admin'),
    ctrl.update);

router.delete('/:id',
    requireAuth, requireRole('vendor', 'admin'),
    ctrl.remove);

module.exports = router;