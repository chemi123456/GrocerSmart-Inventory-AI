const express = require('express');
const router = express.Router();
const { getAllPurchaseOrders, updatePurchaseOrder } = require('../controllers/supplierController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/', getAllPurchaseOrders);
router.put('/:id', restrictTo('ADMIN', 'MANAGER'), updatePurchaseOrder);

module.exports = router;
