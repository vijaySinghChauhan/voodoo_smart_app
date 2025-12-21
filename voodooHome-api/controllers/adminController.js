const { pool } = require('../config/db');

// Admin: list users with optional search
exports.listUsers = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    let sql = `SELECT id, name, email, phone, avatar, role, beta, tester, created_at, last_login FROM users`;
    let params = [];
    if (search) {
      sql += ` WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?`;
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const [users] = await pool.query(sql, params);

    // Attach basic counts
    const ids = users.map(u => u.id);
    let roomCounts = {}, deviceCounts = {};
    if (ids.length) {
      const [roomRows] = await pool.query(`SELECT user_id, COUNT(*) AS cnt FROM rooms WHERE user_id IN (${ids.map(()=>'?').join(',')}) GROUP BY user_id`, ids);
      for (const r of roomRows) roomCounts[r.user_id] = r.cnt;
      const [devRows] = await pool.query(`SELECT user_id, COUNT(*) AS cnt FROM devices WHERE user_id IN (${ids.map(()=>'?').join(',')}) GROUP BY user_id`, ids);
      for (const d of devRows) deviceCounts[d.user_id] = d.cnt;
    }

    const data = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || null,
      avatar: u.avatar || null,
      role: u.role,
      beta: typeof u.beta === 'number' ? u.beta : (u.beta ? 1 : 0),
      tester: typeof u.tester === 'number' ? u.tester : (u.tester ? 1 : 0),
      createdAt: u.created_at,
      lastLogin: u.last_login,
      roomCount: roomCounts[u.id] || 0,
      deviceCount: deviceCounts[u.id] || 0,
    }));
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Admin listUsers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get rooms for a user
exports.getUserRooms = async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await pool.query('SELECT id, name, type, created_at FROM rooms WHERE user_id=? ORDER BY created_at DESC', [userId]);

    // device counts by room
    const roomIds = rows.map(r => r.id);
    let counts = {};
    if (roomIds.length) {
      const [devRows] = await pool.query(`SELECT room_id, COUNT(*) AS cnt FROM devices WHERE room_id IN (${roomIds.map(()=>'?').join(',')}) GROUP BY room_id`, roomIds);
      for (const r of devRows) counts[r.room_id] = r.cnt;
    }
    const data = rows.map(r => ({ id: r.id, name: r.name, type: r.type, createdAt: r.created_at, deviceCount: counts[r.id] || 0 }));
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Admin getUserRooms error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get devices for a user (optionally by room)
exports.getUserDevices = async (req, res) => {
  try {
    const userId = req.params.id;
    const roomId = req.query.roomId || null;
    let sql = 'SELECT id, name, device_type AS deviceType, is_on AS isOn, brightness, ip_address AS ipAddress, room_id AS roomId, created_at FROM devices WHERE user_id=?';
    const params = [userId];
    if (roomId) { sql += ' AND room_id=?'; params.push(roomId); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Admin getUserDevices error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: stats for dashboard
exports.getStats = async (req, res) => {
  try {
    const [usersTotalRows] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const totalUsers = usersTotalRows[0]?.total || 0;
    const [subsTotalRows] = await pool.query('SELECT COUNT(*) AS total FROM subscriptions WHERE status=\'active\'');
    const totalSubscriptions = subsTotalRows[0]?.total || 0;
    const [devicesTotalRows] = await pool.query('SELECT COUNT(*) AS total FROM devices');
    const totalDevices = devicesTotalRows[0]?.total || 0;

    // Trends: last 8 weeks (ISO weeks, Monday start)
    const [usersTrend] = await pool.query(`
      SELECT 
        YEARWEEK(created_at, 1) AS yw,
        DATE_FORMAT(DATE_SUB(DATE(created_at), INTERVAL WEEKDAY(created_at) DAY), '%Y-%m-%d') AS week_start,
        COUNT(*) AS count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
      GROUP BY yw, week_start
      ORDER BY week_start ASC
    `);
    const [subsTrend] = await pool.query(`
      SELECT 
        YEARWEEK(start_date, 1) AS yw,
        DATE_FORMAT(DATE_SUB(DATE(start_date), INTERVAL WEEKDAY(start_date) DAY), '%Y-%m-%d') AS week_start,
        COUNT(*) AS count
      FROM subscriptions
      WHERE start_date >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK) AND status='active'
      GROUP BY yw, week_start
      ORDER BY week_start ASC
    `);
    const [logPie] = await pool.query(`
      SELECT event_type AS type, COUNT(*) AS count
      FROM logs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY event_type
    `);

    res.json({
      success: true,
      users: { total: totalUsers, trend: usersTrend },
      subscriptions: { total: totalSubscriptions, trend: subsTrend },
      logs: { pie: logPie },
      devices: { total: totalDevices }
    });
  } catch (err) {
    console.error('Admin getStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
