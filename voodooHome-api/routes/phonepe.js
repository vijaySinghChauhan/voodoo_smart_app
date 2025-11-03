const express = require('express');
const router = express.Router();

// Placeholder PhonePe routes to prevent server crash
router.get('/', (req, res) => {
  res.json({ success: true, message: 'PhonePe route placeholder' });
});

module.exports = router;