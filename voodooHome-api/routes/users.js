const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

// Authenticated users can list other users
router.get('/', protect, usersController.listUsers);

module.exports = router;

