/* ============================================================
   SERVICE ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/serviceController');
const { requireAuth, requireRole } = require('../middleware/auth');

/* Public */
router.get('/',      ctrl.list);
router.get('/:id',   ctrl.getOne);

/* Admin */
router.post('/',
    requireAuth, requireRole('admin'),
    ctrl.create);

router.patch('/:id',
    requireAuth, requireRole('admin'),
    ctrl.update);

router.delete('/:id',
    requireAuth, requireRole('admin'),
    ctrl.remove);

module.exports = router;