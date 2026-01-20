const express = require('express');
const router = express.Router();
const { checkVersion, getUpdateDialog } = require('../controllers/appController');
router.get('/version/check', checkVersion);
router.get('/update/dialog', getUpdateDialog);
module.exports = router;
