const router = require('express').Router();
const ctrl = require('../controllers/etfController');
const { protect } = require('../middleware/auth');

router.get('/exchanges', ctrl.listExchanges);
router.get('/companies', ctrl.listCompanies);
router.get('/companies/:symbol', ctrl.getCompany);
router.get('/live', ctrl.livePrices);

router.use(protect);
router.post('/buy', ctrl.buy);
router.post('/sell', ctrl.sell);
router.get('/portfolio', ctrl.portfolio);

module.exports = router;