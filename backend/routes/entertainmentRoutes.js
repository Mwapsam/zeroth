const router = require('express').Router();
const ctrl = require('../controllers/entertainmentController');
const { protect, restrictTo } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/:id/like', ctrl.like);
router.post('/upload', uploadSingle('file'), ctrl.upload);
router.delete('/:id', protect, restrictTo('admin'), ctrl.remove);

module.exports = router;