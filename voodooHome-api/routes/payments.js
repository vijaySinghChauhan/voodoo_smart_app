const express = require('express');
const router = express.Router();
const { getPaymentKey, createRazorpayOrder } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.get('/key', getPaymentKey);
router.post('/razorpay/order', protect, createRazorpayOrder);

module.exports = router;
