const express = require('express');
const router = express.Router();
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomDevices,
  addDeviceToRoom,
  removeDeviceFromRoom,
  updateRoomDeviceStatus
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getRooms)
  .post(protect, createRoom);

router.route('/:id')
  .get(protect, getRoom)
  .put(protect, updateRoom)
  .delete(protect, deleteRoom);

// Room devices management
router.get('/:id/devices', protect, getRoomDevices);
router.post('/:id/devices', protect, addDeviceToRoom);
router.delete('/:id/devices/:deviceId', protect, removeDeviceFromRoom);
router.patch('/:id/devices/:deviceId/status', protect, updateRoomDeviceStatus);

module.exports = router;