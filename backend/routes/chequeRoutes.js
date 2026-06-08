const express = require('express');
const router = express.Router();
const { createCheque, getAllCheques, getCheque, updateChequeStatus, deleteCheque } = require('../controllers/chequeController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAllCheques)
  .post(restrictTo('ADMIN', 'MANAGER'), createCheque);

router.route('/:id')
  .get(getCheque)
  .delete(restrictTo('ADMIN', 'MANAGER'), deleteCheque);

router.put('/:id/status', restrictTo('ADMIN', 'MANAGER'), updateChequeStatus);

module.exports = router;
