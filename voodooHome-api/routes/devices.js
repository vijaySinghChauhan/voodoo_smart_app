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
  getDeviceState
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

module.exports = router;