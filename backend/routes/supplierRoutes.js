const express = require('express');
const router = express.Router();
const {
  createSupplier,
  getAllSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  createPurchaseOrder,
  getAllPurchaseOrders,
  updatePurchaseOrder
} = require('../controllers/supplierController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

// Supplier CRUD
router.route('/')
  .get(getAllSuppliers)
  .post(restrictTo('ADMIN', 'MANAGER'), createSupplier);

router.route('/:id')
  .get(getSupplier)
  .put(restrictTo('ADMIN', 'MANAGER'), updateSupplier)
  .delete(restrictTo('ADMIN'), deleteSupplier);

// Purchase Orders under supplier
router.post('/:supplierId/purchase-orders', restrictTo('ADMIN', 'MANAGER'), createPurchaseOrder);

module.exports = router;
