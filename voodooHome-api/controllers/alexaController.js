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

const capabilityOnOff = {
  type: 'AlexaInterface',
  interface: 'Alexa.PowerController',
  version: '3',
  properties: { supported: [{ name: 'powerState' }], retrievable: true }
};
const capabilityBrightness = {
  type: 'AlexaInterface',
  interface: 'Alexa.BrightnessController',
  version: '3',
  properties: { supported: [{ name: 'brightness' }], retrievable: true }
};

exports.fulfillment = async (req, res) => {
  const userId = getUserIdFromAuth(req);
  const body = req.body || {};
  const directive = body.directive || {};
  const header = directive.header || {};
  const name = header.name;

  if (!userId) {
    return res.status(401).json({ event: { header: { namespace: 'Alexa', name: 'ErrorResponse' }, payload: { type: 'INVALID_AUTHORIZATION_CREDENTIAL' } } });
  }

  try {
    if (header.namespace === 'Alexa.Discovery' && name === 'Discover') {
      const devices = await Device.find({ user: userId });
      const endpoints = devices.map(d => ({
        endpointId: String(d.id),
        manufacturerName: 'VooDooHome',
        friendlyName: d.name || `Device ${d.id}`,
        description: 'VooDooHome Smart Device',
        displayCategories: ['LIGHT'],
        cookie: {},
        capabilities: [capabilityOnOff, capabilityBrightness]
      }));
      return res.json({ event: { header: { namespace: 'Alexa.Discovery', name: 'Discover.Response', payloadVersion: '3', messageId: String(Date.now()) }, payload: { endpoints } } });
    }

    if (header.namespace === 'Alexa.PowerController' && (name === 'TurnOn' || name === 'TurnOff')) {
      const endpointId = directive.endpoint.endpointId;
      const dev = await Device.findById(endpointId);
      if (!dev || String(dev.user) !== String(userId)) {
        return res.status(404).json({ event: { header: { namespace: 'Alexa', name: 'ErrorResponse' }, payload: { type: 'NO_SUCH_ENDPOINT' } } });
      }
      const isOn = name === 'TurnOn';
      const updated = await Device.findByIdAndUpdate(endpointId, { isOn });
      return res.json({ context: { properties: [{ namespace: 'Alexa.PowerController', name: 'powerState', value: isOn ? 'ON' : 'OFF' }] }, event: { header: { namespace: 'Alexa', name: 'Response', payloadVersion: '3', messageId: String(Date.now()) }, endpoint: { endpointId }, payload: {} } });
    }

    if (header.namespace === 'Alexa.BrightnessController' && name === 'SetBrightness') {
      const endpointId = directive.endpoint.endpointId;
      const dev = await Device.findById(endpointId);
      if (!dev || String(dev.user) !== String(userId)) {
        return res.status(404).json({ event: { header: { namespace: 'Alexa', name: 'ErrorResponse' }, payload: { type: 'NO_SUCH_ENDPOINT' } } });
      }
      const brightness = Number(directive.payload.brightness);
      const updated = await Device.findByIdAndUpdate(endpointId, { brightness });
      return res.json({ context: { properties: [{ namespace: 'Alexa.BrightnessController', name: 'brightness', value: Number(updated.brightness || 0) }] }, event: { header: { namespace: 'Alexa', name: 'Response', payloadVersion: '3', messageId: String(Date.now()) }, endpoint: { endpointId }, payload: {} } });
    }

    // Default response for unsupported directives
    return res.status(400).json({ event: { header: { namespace: 'Alexa', name: 'ErrorResponse' }, payload: { type: 'INVALID_DIRECTIVE' } } });
  } catch (e) {
    console.error('Alexa fulfillment error:', e);
    return res.status(500).json({ event: { header: { namespace: 'Alexa', name: 'ErrorResponse' }, payload: { type: 'INTERNAL_ERROR' } } });
  }
};

