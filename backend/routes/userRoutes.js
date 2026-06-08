const express = require('express');
const router = express.Router();
const { getAllUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect); // All user routes require authentication

router.get('/', getAllUsers);
router.get('/:id', getUser);
router.put('/:id', restrictTo('ADMIN', 'MANAGER'), updateUser);
router.delete('/:id', restrictTo('ADMIN'), deleteUser);

module.exports = router;
