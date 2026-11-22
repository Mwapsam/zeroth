/* ============================================================
   PARTNER ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/partnerController');
const { requireAuth, requireRole } = require('../middleware/auth');

/* Public catalog */
router.get('/',     ctrl.list);
router.get('/:id',  ctrl.getOne);

/* Applications — anyone can apply */
router.post('/apply',   ctrl.apply);
router.post('/become',  ctrl.becomePartner);

/* Admin CRUD */
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