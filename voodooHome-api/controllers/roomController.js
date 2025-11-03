const Room = require('../models/Room');
const Device = require('../models/Device');

// @desc    Get all rooms for a user
// @route   GET /api/rooms
// @access  Private
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ user: req.user.id });
    // Compute deviceCount for each room via SQL, but don't fail if DB is down
    const { pool } = require('../config/db');
    const roomIds = rooms.map(r => r.id);
    let counts = {};
    if (roomIds.length) {
      try {
        const [rows] = await pool.query(
          `SELECT room_id AS roomId, COUNT(*) AS cnt FROM devices WHERE room_id IN (${roomIds.map(()=>'?' ).join(',')}) GROUP BY room_id`,
          roomIds
        );
        for (const r of rows) counts[r.roomId] = r.cnt;
      } catch (err) {
        console.warn('Room deviceCount query failed:', err.message);
      }
    }
    const payload = rooms.map(r => ({ id: r.id, _id: r._id, name: r.name, type: r.type, user: r.user, createdAt: r.createdAt, deviceCount: counts[r.id] || 0 }));
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Make sure user owns room
    if (String(room.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this room' });
    }

    // Attach deviceCount for detail view
    const { pool } = require('../config/db');
    let deviceCount = 0;
    try {
      const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM devices WHERE room_id=?', [room.id]);
      deviceCount = rows[0]?.cnt || 0;
    } catch (err) {
      console.warn('Room deviceCount query failed:', err.message);
    }
    res.json({ id: room.id, _id: room._id, name: room.name, type: room.type, user: room.user, createdAt: room.createdAt, deviceCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private
exports.createRoom = async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;

    const room = await Room.create(req.body);

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private
exports.updateRoom = async (req, res) => {
  try {
    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Make sure user owns room
    if (String(room.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to update this room' });
    }

    room = await Room.findByIdAndUpdate(req.params.id, req.body);

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Make sure user owns room
    if (String(room.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to delete this room' });
    }

    // Remove room reference from all devices in this room (SQL)
    const { pool } = require('../config/db');
    await pool.query('UPDATE devices SET room_id = NULL WHERE room_id = ?', [room.id]);

    await room.remove();

    res.json({});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};