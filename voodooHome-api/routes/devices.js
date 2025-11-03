const express = require('express');
const router = express.Router();
const { 
  getDevices, 
  getDevice, 
  createDevice, 
  updateDevice, 
  deleteDevice,
  checkDeviceStatus,
  configureDeviceWifi,
  controlDevice,
  getDeviceState,
  resetESPDevice,
  disableESPDevice,
  switchESPDevice,
  getDeviceEnergy
} = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getDevices)
  .post(protect, createDevice);

router.route('/:id')
  .get(protect, getDevice)
  .put(protect, updateDevice)
  .delete(protect, deleteDevice);

router.get('/:id/status', protect, checkDeviceStatus);
router.post('/:id/configure', protect, configureDeviceWifi);
router.post('/:id/control', protect, controlDevice);
router.get('/:id/state', protect, getDeviceState);

// ESP8266 WiFi endpoints
router.post('/:id/reset', protect, resetESPDevice);
router.post('/:id/disable', protect, disableESPDevice);
router.get('/:id/switch', protect, switchESPDevice);
router.get('/:id/energy', protect, getDeviceEnergy);

module.exports = router;