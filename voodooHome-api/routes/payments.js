const express = require('express');
const router = express.Router();
const { getPaymentKey } = require('../controllers/paymentController');

router.get('/key', getPaymentKey);

module.exports = router;