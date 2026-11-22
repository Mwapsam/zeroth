/* ============================================================
   ETF ROUTES
   ============================================================ */
const router = require('express').Router();
const ctrl = require('../controllers/etfController');
const { requireAuth } = require('../middleware/auth');

/* Public market data */
router.get('/exchanges',            ctrl.listExchanges);
router.get('/companies',            ctrl.listCompanies);
router.get('/companies/:symbol',    ctrl.getCompany);
router.get('/live',                 ctrl.livePrices);

/* Trading — auth required */
router.use(requireAuth);
router.post('/buy',        ctrl.buy);
router.post('/sell',       ctrl.sell);
router.get('/portfolio',   ctrl.portfolio);

module.exports = router;