const express = require('express');
const router = express.Router();
const { fulfillment } = require('../controllers/alexaController');

// Alexa Smart Home fulfillment
router.post('/fulfillment', express.json({ limit: '1mb' }), fulfillment);

module.exports = router;

