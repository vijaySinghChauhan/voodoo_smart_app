const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { createLog, batchLogs } = require('../controllers/logsController');

// Single log event
router.post(
  '/',
  protect,
  [
    body('eventType').isString().notEmpty(),
    body('screen').optional().isString(),
    body('action').optional().isString(),
    body('metadata').optional(),
    body('timestamp').optional().isISO8601()
  ],
  createLog
);

// Batch log events
router.post('/batch', protect, batchLogs);

module.exports = router;
