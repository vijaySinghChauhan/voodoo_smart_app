const { pool } = require('../config/db');
const { validationResult } = require('express-validator');

exports.createLog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const userId = req.user ? req.user.id : null;
    const { eventType, screen, action, metadata, timestamp } = req.body || {};
    const metaStr = metadata ? JSON.stringify(metadata) : null;
    const createdAt = timestamp ? new Date(timestamp) : new Date();
    // Insert log
    const sql = 'INSERT INTO logs (user_id, event_type, screen, action, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)';
    await pool.query(sql, [userId, String(eventType || ''), screen || null, action || null, metaStr, createdAt]);
    return res.status(201).json({ message: 'Logged' });
  } catch (err) {
    console.error('Failed to create log:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.batchLogs = async (req, res) => {
  try {
    const logs = Array.isArray(req.body?.logs) ? req.body.logs : [];
    if (!logs.length) {
      return res.status(400).json({ message: 'No logs provided' });
    }
    const userId = req.user ? req.user.id : null;
    const sql = 'INSERT INTO logs (user_id, event_type, screen, action, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)';
    const params = logs.map(l => [
      userId,
      String(l.eventType || ''),
      l.screen || null,
      l.action || null,
      l.metadata ? JSON.stringify(l.metadata) : null,
      l.timestamp ? new Date(l.timestamp) : new Date()
    ]);
    for (const p of params) {
      await pool.query(sql, p);
    }
    return res.status(201).json({ message: 'Batch logged', count: params.length });
  } catch (err) {
    console.error('Failed to batch logs:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
