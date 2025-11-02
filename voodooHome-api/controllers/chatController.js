const Chat = require('../models/Chat');

// @desc    Get all messages for a room
// @route   GET /api/chat/:roomId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const messages = await Chat.find({ room: req.params.roomId });
    res.json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message to a room
// @route   POST /api/chat/:roomId
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Chat.create({
      room: req.params.roomId,
      user: req.user.id,
      text
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};