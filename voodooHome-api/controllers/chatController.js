const Chat = require('../models/Chat');

// @desc    Get all messages for a room
// @route   GET /api/chat/:roomId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const messages = await Chat.find({ room: req.params.roomId });
    return res.json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    // Fallback to in-memory cache when DB is unavailable
    try {
      const cache = req.app && req.app.get && req.app.get('chatCache');
      const arr = (cache && cache.get && cache.get(req.params.roomId)) || [];
      return res.json({ success: true, count: arr.length, data: arr });
    } catch (e) {
      console.error('Chat history error:', error?.message || error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
};

// @desc    Send a message to a room
// @route   POST /api/chat/:roomId
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Chat.create({ room: req.params.roomId, user: req.user.id, text });
    // Also push to cache for immediate availability
    try {
      const cache = req.app && req.app.get && req.app.get('chatCache');
      if (cache) {
        const payload = {
          id: String(message.id),
          text: message.text,
          sender: (req.user && req.user.name) || 'Unknown',
          timestamp: message.createdAt || new Date(),
        };
        const arr = cache.get(req.params.roomId) || [];
        arr.push(payload);
        if (arr.length > 200) arr.splice(0, arr.length - 200);
        cache.set(req.params.roomId, arr);
      }
    } catch (e) { /* ignore cache errors */ }
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    // Fallback to cache-only when DB is down
    try {
      const cache = req.app && req.app.get && req.app.get('chatCache');
      const payload = {
        id: String(Date.now()),
        text: String(req.body?.text || ''),
        sender: (req.user && req.user.name) || 'Unknown',
        timestamp: new Date(),
      };
      if (cache) {
        const arr = cache.get(req.params.roomId) || [];
        arr.push(payload);
        if (arr.length > 200) arr.splice(0, arr.length - 200);
        cache.set(req.params.roomId, arr);
      }
      return res.status(201).json({ success: true, data: payload });
    } catch (e) {
      console.error('sendMessage error:', error?.message || error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
};
