const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All routes require admin role
router.use(protect, authorize('admin'));

// List users with optional search
router.get('/users', adminController.listUsers);

// User drilldowns
router.get('/users/:id/rooms', adminController.getUserRooms);
router.get('/users/:id/devices', adminController.getUserDevices);

// Stats dashboard
router.get('/stats', adminController.getStats);

module.exports = router;
