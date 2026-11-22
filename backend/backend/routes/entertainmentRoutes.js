/* ============================================================
   ENTERTAINMENT ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/entertainmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

/* Catalog */
router.get('/',     ctrl.list);
router.get('/:id',  ctrl.getOne);
router.post('/:id/like', ctrl.like);

/* Upload — auth required; admin key in header still controls approval */
router.post('/upload',
    requireAuth,
    uploadSingle('file'),
    ctrl.upload);

/* Admin delete */
router.delete('/:id',
    requireAuth, requireRole('admin'),
    ctrl.remove);

module.exports = router;