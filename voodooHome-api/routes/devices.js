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
  getDeviceEnergy,
  shareDevice,
  getDeviceUsers,
  removeDeviceUser,
  subscribeSubdevice,
  registerESPDevicePublic,
  claimDevice,
  getDeviceBrightness
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

// Public registration endpoint for ESP modules (no auth)
router.post('/register-esp', registerESPDevicePublic);

// Claim device to current user
router.patch('/:id/claim', protect, claimDevice);

// ESP8266 WiFi endpoints
router.post('/:id/reset', protect, resetESPDevice);
router.post('/:id/disable', protect, disableESPDevice);
router.get('/:id/switch', protect, switchESPDevice);
router.get('/:id/energy', protect, getDeviceEnergy);
router.get('/:id/brightness', protect, getDeviceBrightness);
router.post('/:id/share', protect, shareDevice);
router.get('/:id/users', protect, getDeviceUsers);
router.delete('/:id/users/:email', protect, removeDeviceUser);
router.post('/:id/subscribe-subdevice', protect, subscribeSubdevice);

module.exports = router;
