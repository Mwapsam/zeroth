/* ============================================================
   CONTACT ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/contactController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { contactRules, validate } = require('../utils/validators');

/* Anyone can submit a contact message */
router.post('/', contactRules, validate, ctrl.create);

/* Admin management */
router.get('/',
    requireAuth, requireRole('admin'),
    ctrl.list);

router.patch('/:id/status',
    requireAuth, requireRole('admin'),
    ctrl.updateStatus);

router.delete('/:id',
    requireAuth, requireRole('admin'),
    ctrl.remove);

module.exports = router;