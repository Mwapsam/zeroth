const router = require('express').Router();
const ctrl = require('../controllers/educationController');
const { optionalAuth } = require('../middleware/auth');

router.get('/institutions', ctrl.listInstitutions);
router.get('/institutions/:id', ctrl.getInstitution);
router.get('/library', ctrl.listLibrary);
router.post('/tutor-request', optionalAuth, ctrl.createTutorRequest);

module.exports = router;