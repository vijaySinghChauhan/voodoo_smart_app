const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');

router.route('/')
  .get(protect, getAddresses)
  .post(protect, createAddress);

router.route('/:id')
  .get(protect, getAddress)
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

router.patch('/:id/default', protect, setDefaultAddress);

module.exports = router;