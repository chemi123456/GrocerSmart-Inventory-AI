const express = require('express');
const router = express.Router();
const {
  createCreditCustomer,
  getAllCreditCustomers,
  getCreditCustomer,
  updateCreditCustomer,
  postPayment,
  deleteCreditCustomer
} = require('../controllers/creditController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAllCreditCustomers)
  .post(restrictTo('ADMIN', 'MANAGER'), createCreditCustomer);

router.route('/:id')
  .get(getCreditCustomer)
  .put(restrictTo('ADMIN', 'MANAGER'), updateCreditCustomer)
  .delete(restrictTo('ADMIN'), deleteCreditCustomer);

router.put('/:id/payment', restrictTo('ADMIN', 'MANAGER', 'CASHIER'), postPayment);

module.exports = router;
