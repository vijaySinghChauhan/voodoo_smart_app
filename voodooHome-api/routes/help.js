const express = require('express');
const router = express.Router();
const { getHelp } = require('../controllers/helpController');

router.get('/', getHelp);

module.exports = router;