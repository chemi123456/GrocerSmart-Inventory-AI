const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAllProducts)
  .post(restrictTo('ADMIN', 'MANAGER'), createProduct);

router.route('/:id')
  .get(getProduct)
  .put(restrictTo('ADMIN', 'MANAGER'), updateProduct)
  .delete(restrictTo('ADMIN', 'MANAGER'), deleteProduct);

module.exports = router;
