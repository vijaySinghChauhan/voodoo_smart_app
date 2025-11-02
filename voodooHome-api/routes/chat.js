const express = require('express');
const router = express.Router();
const { getMessages, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Get all messages for a room
router.get('/:roomId', protect, getMessages);

// Send a message to a room
router.post('/:roomId', protect, sendMessage);

module.exports = router;