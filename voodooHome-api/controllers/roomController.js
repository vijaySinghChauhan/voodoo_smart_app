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
    const payload = rooms.map(r => ({ id: r.id, _id: r._id, name: r.name, type: r.type, user: r.user, roomId: r.roomId, room_id: r.roomId, createdAt: r.createdAt, deviceCount: counts[r.id] || 0 }));
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
    res.json({ id: room.id, _id: room._id, name: room.name, type: room.type, user: room.user, roomId: room.roomId, room_id: room.roomId, createdAt: room.createdAt, deviceCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    List devices for a room
// @route   GET /api/rooms/:id/devices
// @access  Private
exports.getRoomDevices = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (String(room.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this room' });
    }
    const devices = await Device.find({ user: req.user.id, room: room.id });
    res.json({ success: true, count: devices.length, data: devices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add (assign or create) device to a room
// @route   POST /api/rooms/:id/devices
// @access  Private
exports.addDeviceToRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (String(room.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to modify this room' });
    }

    const { deviceId } = req.body;
    let device;
    if (deviceId) {
      device = await Device.findById(deviceId);
      if (!device) {
        return res.status(404).json({ message: 'Device not found' });
      }
      if (String(device.user) !== String(req.user.id)) {
        return res.status(401).json({ message: 'Not authorized to use this device' });
      }
      device = await Device.findByIdAndUpdate(device.id, { room: room.id });
    } else {
      // Create a new device and assign to room
      const payload = {
        user: req.user.id,
        room: room.id,
        name: req.body.name,
        deviceType: req.body.deviceType,
        macAddress: req.body.macAddress,
        ipAddress: req.body.ipAddress,
        ssid: req.body.ssid,
        isConnected: !!req.body.isConnected,
        isOn: !!req.body.isOn,
        brightness: typeof req.body.brightness === 'number' ? req.body.brightness : 1,
        firmwareVersion: req.body.firmwareVersion,
      };
      device = await Device.create(payload);
    }

    res.status(201).json({ success: true, data: device });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove device from a room (unassign)
// @route   DELETE /api/rooms/:id/devices/:deviceId
// @access  Private
exports.removeDeviceFromRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (String(room.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to modify this room' });
    }

    const device = await Device.findById(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to use this device' });
    }
    await Device.findByIdAndUpdate(device.id, { room: null });
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update device status within a room
// @route   PATCH /api/rooms/:id/devices/:deviceId/status
// @access  Private
exports.updateRoomDeviceStatus = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (String(room.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to modify this room' });
    }
    const { status } = req.body;
    if (!status || !['on', 'off'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const device = await Device.findById(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to use this device' });
    }
    const updated = await Device.findByIdAndUpdate(device.id, { isOn: status === 'on' });
    res.json({ success: true, data: updated });
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
