/* ============================================================
   APPLICATION ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/applicationController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { applicationRules, validate } = require('../utils/validators');

/* Create — guests allowed (loan form, share purchase, etc.) */
router.post('/',
    optionalAuth,
    applicationRules, validate,
    ctrl.create);

/* Mine — auth OR ?email= for guests */
router.get('/mine', optionalAuth, ctrl.listMine);

/* Admin */
router.get('/',
    requireAuth, requireRole('admin'),
    ctrl.listAll);

/* Specific before :id */
router.get('/:id',          requireAuth, ctrl.getOne);
router.patch('/:id/status',
    requireAuth, requireRole('admin'),
    ctrl.updateStatus);

module.exports = router;