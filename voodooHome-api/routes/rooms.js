const express = require('express');
const router = express.Router();
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getRooms)
  .post(protect, createRoom);

router.route('/:id')
  .get(protect, getRoom)
  .put(protect, updateRoom)
  .delete(protect, deleteRoom);

module.exports = router;