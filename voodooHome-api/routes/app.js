const express = require('express');
const router = express.Router();
const { checkVersion } = require('../controllers/appController');
router.get('/version/check', checkVersion);
module.exports = router;
