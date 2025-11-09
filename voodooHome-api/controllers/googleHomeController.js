const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const { JWT_SECRET } = require('../Static/constants');

const getUserIdFromAuth = (req) => {
  try {
    const bearer = req.headers.authorization || '';
    const token = bearer.startsWith('Bearer ') ? bearer.substring(7) : null;
    const secret = process.env.JWT_SECRET || JWT_SECRET || 'fallback_secret';
    if (!token) return null;
    const payload = jwt.verify(token, secret);
    return payload.id;
  } catch (e) {
    return null;
  }
};

const mapDeviceToGoogle = (d) => ({
  id: String(d.id),
  type: 'action.devices.types.LIGHT',
  traits: [
    'action.devices.traits.OnOff',
    'action.devices.traits.Brightness'
  ],
  name: { name: d.name || `Device ${d.id}` },
  willReportState: false,
  deviceInfo: {
    manufacturer: 'VooDooHome',
    model: d.deviceType || 'ESP8266',
    hwVersion: d.firmwareVersion || '1.0'
  }
});

exports.fulfillment = async (req, res) => {
  const userId = getUserIdFromAuth(req);
  const body = req.body || {};
  const intent = body.inputs && body.inputs[0] && body.inputs[0].intent;
  const requestId = body.requestId || String(Date.now());

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (intent === 'action.devices.SYNC') {
      const devices = await Device.find({ user: userId });
      const payload = {
        agentUserId: String(userId),
        devices: devices.map(mapDeviceToGoogle)
      };
      return res.json({ requestId, payload });
    }

    if (intent === 'action.devices.QUERY') {
      const ids = body.inputs[0].payload && body.inputs[0].payload.devices && body.inputs[0].payload.devices.map(d => d.id) || [];
      const states = {};
      for (const id of ids) {
        const dev = await Device.findById(id);
        if (dev && String(dev.user) === String(userId)) {
          states[id] = { on: !!dev.isOn, online: !!dev.isConnected, brightness: Number(dev.brightness || 0) };
        }
      }
      return res.json({ requestId, payload: { devices: states } });
    }

    if (intent === 'action.devices.EXECUTE') {
      const commands = body.inputs[0].payload && body.inputs[0].payload.commands || [];
      const results = [];
      for (const cmd of commands) {
        const ids = (cmd.devices || []).map(d => d.id);
        for (const exec of (cmd.execution || [])) {
          for (const id of ids) {
            const dev = await Device.findById(id);
            if (!dev || String(dev.user) !== String(userId)) continue;
            let updated;
            switch (exec.command) {
              case 'action.devices.commands.OnOff':
                updated = await Device.findByIdAndUpdate(id, { isOn: !!exec.params.on });
                break;
              case 'action.devices.commands.BrightnessAbsolute':
                updated = await Device.findByIdAndUpdate(id, { brightness: Number(exec.params.brightness || 0) });
                break;
              default:
                break;
            }
            if (updated) {
              results.push({
                ids: [String(id)],
                status: 'SUCCESS',
                states: { on: !!updated.isOn, brightness: Number(updated.brightness || 0), online: !!updated.isConnected }
              });
            }
          }
        }
      }
      return res.json({ requestId, payload: { commands: results } });
    }

    return res.status(400).json({ error: 'Unsupported intent' });
  } catch (e) {
    console.error('Google fulfillment error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
};

