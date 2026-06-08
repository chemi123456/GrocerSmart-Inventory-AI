const express = require('express');
const router = express.Router();
const { getDemandForecast, assessCreditRisk } = require('../controllers/aiController');
const { protect, restrictTo } = require('../middleware/auth');

// Apply protection to all AI routes
router.use(protect);

router.post('/forecast', restrictTo('ADMIN', 'MANAGER'), getDemandForecast);
router.post('/credit-risk', restrictTo('ADMIN', 'MANAGER', 'CASHIER'), assessCreditRisk);

module.exports = router;
