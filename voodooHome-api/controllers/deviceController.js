const Device = require('../models/Device');
const Room = require('../models/Room');
const axios = require('axios');

// @desc    Get all devices for a user
// @route   GET /api/devices
// @access  Private
exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.find({ user: req.user.id });
    
    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Private
exports.getDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Make sure user owns device
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new device
// @route   POST /api/devices
// @access  Private
exports.createDevice = async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;

    // Check if room exists if room ID is provided
    if (req.body.room) {
      const room = await Room.findById(req.body.room);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Make sure user owns room
      if (room.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to use this room' });
      }
    }

    const device = await Device.create(req.body);

    // Room assignment is handled via device.room_id in SQL

    res.status(201).json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private
exports.updateDevice = async (req, res) => {
  try {
    let device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Make sure user owns device
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to update this device' });
    }

    // If room is being changed, verify new room belongs to user
    if (req.body.room && (!device.room || String(device.room) !== String(req.body.room))) {
      const room = await Room.findById(req.body.room);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      if (String(room.user) !== String(req.user.id)) {
        return res.status(401).json({ message: 'Not authorized to use this room' });
      }
    }

    const prevBrightness = device && typeof device.brightness === 'number' ? device.brightness : undefined;
    device = await Device.findByIdAndUpdate(req.params.id, req.body);

    res.json({
      success: true,
      data: device
    });

    // Emit brightness change to socket clients if updated via PUT
    try {
      const io = req.app && req.app.get && req.app.get('io');
      const changed = req.body && req.body.brightness !== undefined && req.body.brightness !== prevBrightness;
      if (io && changed) {
        const idForRoom = device._id || device.id;
        io.to(`device:${idForRoom}`).emit('brightness:update', { deviceId: idForRoom, value: device.brightness });
      }
    } catch (e) {
      // ignore socket errors
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Make sure user owns device
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to delete this device' });
    }

    // Room references are managed via device.room_id; nothing to pull from rooms

    await device.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check device status
// @route   GET /api/devices/:id/status
// @access  Private
exports.checkDeviceStatus = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Make sure user owns device
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    // In a real application, you would communicate with the device here
    // For now, we'll just return the current status
    res.json({
      success: true,
      data: {
        isConnected: device.isConnected,
        lastSeen: device.lastSeen,
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        ssid: device.ssid,
        firmwareVersion: device.firmwareVersion,
        room: device.room,
        isOn: device.isOn,
        brightness: device.brightness
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Configure device WiFi
// @route   POST /api/devices/:id/configure
// @access  Private
exports.configureDeviceWifi = async (req, res) => {
  try {
    const { ssid, password } = req.body;

    if (!ssid || !password) {
      return res.status(400).json({ message: 'Please provide SSID and password' });
    }

    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Make sure user owns device
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to configure this device' });
    }

    // In a real application, you would send the configuration to the device here
    // For now, we'll just update the device record
    await Device.findByIdAndUpdate(device.id, { ssid });

    res.json({
      success: true,
      data: await Device.findById(device.id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Control device (turn on/off)
// @route   POST /api/devices/:id/control
// @access  Private
exports.controlDevice = async (req, res) => {
  try {
    const { action, brightness } = req.body;

    if (!action || !['on', 'off', 'toggle'].includes(action)) {
      return res.status(400).json({ message: 'Please provide valid action: on, off, or toggle' });
    }

    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Make sure user owns device
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to control this device' });
    }

    // Update device state based on action
    switch (action) {
      case 'on':
        device.isOn = true;
        break;
      case 'off':
        device.isOn = false;
        break;
      case 'toggle':
        device.isOn = !device.isOn;
        break;
    }

    // Update brightness if provided
    if (brightness !== undefined && brightness >= 0 && brightness <= 100) {
      device.brightness = brightness;
    }

    // Update last seen timestamp and persist state
    const lastSeen = new Date();
    await Device.findByIdAndUpdate(device.id, {
      isOn: device.isOn,
      brightness: device.brightness,
      lastSeen
    });
    const updated = await Device.findById(device.id);

    // In a real application, you would send the control command to the actual device here
    // For ESP8266, you might send HTTP request to device's IP address

    res.json({
      success: true,
      message: `Device ${action === 'toggle' ? (device.isOn ? 'turned on' : 'turned off') : action}`,
      data: {
        id: updated._id,
        name: updated.name,
        isOn: updated.isOn,
        brightness: updated.brightness,
        lastSeen: updated.lastSeen
      }
    });
    // Emit brightness change to socket clients if brightness was included
    try {
      const io = req.app && req.app.get && req.app.get('io');
      const idForRoom = updated._id || updated.id;
      if (io && req.body && req.body.brightness !== undefined) {
        io.to(`device:${idForRoom}`).emit('brightness:update', { deviceId: idForRoom, value: updated.brightness });
      }
    } catch (e) {
      // ignore socket errors
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get device state
// @route   GET /api/devices/:id/state
// @access  Private
exports.getDeviceState = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Make sure user owns device
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    res.json({
      success: true,
      data: {
        id: device._id,
        name: device.name,
        isOn: device.isOn,
        brightness: device.brightness,
        isConnected: device.isConnected,
        lastSeen: device.lastSeen,
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        ssid: device.ssid,
        firmwareVersion: device.firmwareVersion
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Public registration endpoint for ESP modules (no auth)
// @route   POST /voodoo/api/devices/register-esp
// @access  Public
exports.registerESPDevicePublic = async (req, res) => {
  try {
    const { name, deviceType, macAddress, ipAddress, ssid, firmwareVersion, isOn, brightness } = req.body || {};
    if (!macAddress) {
      return res.status(400).json({ message: 'macAddress is required' });
    }

    const existing = await Device.findByMacAddress(macAddress);
    if (existing) {
      const updated = await Device.findByIdAndUpdate(existing.id, {
        name: name !== undefined ? name : existing.name,
        deviceType: deviceType !== undefined ? deviceType : existing.deviceType,
        ipAddress: ipAddress !== undefined ? ipAddress : existing.ipAddress,
        ssid: ssid !== undefined ? ssid : existing.ssid,
        isConnected: true,
        isOn: typeof isOn === 'boolean' ? isOn : existing.isOn,
        brightness: typeof brightness === 'number' ? brightness : existing.brightness,
        firmwareVersion: firmwareVersion !== undefined ? firmwareVersion : existing.firmwareVersion,
        lastSeen: new Date()
      });
      return res.json({ success: true, data: updated, updated: true });
    }

    const created = await Device.create({
      user: null,
      room: null,
      name: name || 'ESP8266 Device',
      deviceType: deviceType || 'ESP8266',
      macAddress,
      ipAddress: ipAddress || null,
      ssid: ssid || null,
      isConnected: true,
      isOn: typeof isOn === 'boolean' ? isOn : false,
      brightness: typeof brightness === 'number' ? brightness : 100,
      firmwareVersion: firmwareVersion || null,
      lastSeen: new Date()
    });
    return res.status(201).json({ success: true, data: created, created: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Claim an unassigned device to current user
// @route   PATCH /voodoo/api/devices/:id/claim
// @access  Private
exports.claimDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    if (device.user && String(device.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Device is owned by another user' });
    }
    const { name, room, deviceType } = req.body || {};
    const updated = await Device.findByIdAndUpdate(device.id, {
      user: req.user.id,
      name: name !== undefined ? name : device.name,
      deviceType: deviceType !== undefined ? deviceType : device.deviceType,
      room: room !== undefined ? room : device.room
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===== ESP8266 WiFi Device APIs =====

// @desc    Reset ESP8266 device
// @route   POST /voodoo/api/devices/:id/reset
// @access  Private
exports.resetESPDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    const baseUrl = device.ipAddress ? `http://${device.ipAddress}` : 'http://192.168.4.1';
    const response = await axios.post(`${baseUrl}/reset`, {}, { timeout: 5000 });
    const ok = response.status === 200 || response.status === 204;
    return res.status(ok ? 200 : 502).json({ success: ok, message: ok ? 'Device reset' : 'Reset failed' });
  } catch (error) {
    console.error('ESP reset error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Disable ESP8266 device
// @route   POST /voodoo/api/devices/:id/disable
// @access  Private
exports.disableESPDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    const baseUrl = device.ipAddress ? `http://${device.ipAddress}` : 'http://192.168.4.1';
    const response = await axios.post(`${baseUrl}/disable`, {}, { timeout: 5000 });
    const ok = response.status === 200 || response.status === 204;

    // Persist disabled state if needed
    if (ok) {
      await Device.findByIdAndUpdate(device.id, { isConnected: false, lastSeen: new Date() });
    }

    return res.status(ok ? 200 : 502).json({ success: ok, message: ok ? 'Device disabled' : 'Disable failed' });
  } catch (error) {
    console.error('ESP disable error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Switch ESP8266 device state
// @route   GET /voodoo/api/devices/:id/switch?state=on|off
// @access  Private
exports.switchESPDevice = async (req, res) => {
  try {
    const state = (req.query.state || '').toLowerCase();
    if (!['on', 'off'].includes(state)) {
      return res.status(400).json({ message: 'Invalid state. Use on|off' });
    }

    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    const baseUrl = device.ipAddress ? `http://${device.ipAddress}` : 'http://192.168.4.1';
    const response = await axios.get(`${baseUrl}/switch?state=${state}`, { timeout: 5000 });
    const ok = response.status === 200 || response.status === 204;

    // Update device.isOn based on switch state
    if (ok) {
      await Device.findByIdAndUpdate(device.id, { isOn: state === 'on', lastSeen: new Date() });
    }

    return res.status(ok ? 200 : 502).json({ success: ok, message: ok ? `Switched ${state}` : 'Switch failed' });
  } catch (error) {
    console.error('ESP switch error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get ESP8266 energy usage
// @route   GET /voodoo/api/devices/:id/energy
// @access  Private
exports.getDeviceEnergy = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    const baseUrl = device.ipAddress ? `http://${device.ipAddress}` : 'http://192.168.4.1';
    let energy = { daily: 0, weekly: 0, monthly: 0 };
    try {
      const response = await axios.get(`${baseUrl}/energy`, { timeout: 5000 });
      if (response.status === 200 && typeof response.data === 'object') {
        energy = response.data;
      }
    } catch (inner) {
      // Fallback demo values if device does not support energy endpoint
      energy = { daily: 1.2, weekly: 8.5, monthly: 32.7 };
    }

    return res.json({ success: true, data: energy });
  } catch (error) {
    console.error('ESP energy error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get device brightness (0-100)
// @route   GET /voodoo/api/devices/:id/brightness
// @access  Private
exports.getDeviceBrightness = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    if (String(device.user) !== String(req.user.id)) {
      return res.status(401).json({ message: 'Not authorized to access this device' });
    }

    const baseUrl = device.ipAddress ? `http://${device.ipAddress}` : 'http://192.168.4.1';
    let brightness = typeof device.brightness === 'number' ? device.brightness : 100;
    try {
      const response = await axios.get(`${baseUrl}/getdata`, { timeout: 5000 });
      let value = response.data;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num)) value = num;
      }
      if (typeof value === 'number') {
        brightness = Math.max(0, Math.min(100, value));
      }
    } catch (inner) {
      // keep existing brightness from DB as fallback
    }

    return res.json({ success: true, data: { brightness } });
  } catch (error) {
    console.error('ESP brightness error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
