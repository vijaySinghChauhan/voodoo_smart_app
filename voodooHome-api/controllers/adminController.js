const { pool } = require('../config/db');

// Admin: list users with optional search
exports.listUsers = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    let sql = `SELECT id, name, email, phone, avatar, role, beta, tester, created_at, last_login, subscription_id, plan_id, user_id FROM users`;
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
      subscriptionId: u.subscription_id || null,
      planId: u.plan_id || null,
      userCode: u.user_id || null,
      roomCount: roomCounts[u.id] || 0,
      deviceCount: deviceCounts[u.id] || 0,
    }));
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Admin listUsers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get single user details
exports.getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await pool.query('SELECT id, name, email, phone, avatar, role, beta, tester, created_at, last_login, subscription_type, subscription_id, subdevice_ids, shared_access_enabled, plan_id, user_id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!rows || !rows[0]) {
      return res.status(404).json({ message: 'User not found' });
    }
    const u = rows[0];
    let subIds = [];
    try {
      if (u.subdevice_ids) {
        const parsed = typeof u.subdevice_ids === 'string' ? JSON.parse(u.subdevice_ids) : u.subdevice_ids;
        subIds = Array.isArray(parsed) ? parsed.map((s) => String(s)) : [];
      }
    } catch (_) { subIds = []; }
    const data = {
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
      subscriptionType: u.subscription_type || null,
      subscriptionId: u.subscription_id || null,
      subdeviceIds: subIds,
      sharedAccessEnabled: typeof u.shared_access_enabled === 'number' ? u.shared_access_enabled : (u.shared_access_enabled ? 1 : 0),
      planId: u.plan_id || null,
      userCode: u.user_id || null,
    };
    res.json({ success: true, data });
  } catch (err) {
    console.error('Admin getUser error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: update user details
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const body = req.body || {};
    const fields = {};
    if (typeof body.name !== 'undefined') fields.name = String(body.name || '');
    if (typeof body.email !== 'undefined') fields.email = String(body.email || '');
    if (typeof body.phone !== 'undefined') fields.phone = String(body.phone || '');
    if (typeof body.role !== 'undefined') fields.role = String(body.role || 'user');
    if (typeof body.beta !== 'undefined') fields.beta = (typeof body.beta === 'boolean') ? (body.beta ? 1 : 0) : Number(body.beta ? 1 : 0);
    if (typeof body.tester !== 'undefined') fields.tester = (typeof body.tester === 'boolean') ? (body.tester ? 1 : 0) : Number(body.tester ? 1 : 0);
    if (typeof body.subscriptionType !== 'undefined') fields.subscription_type = String(body.subscriptionType || '');
    if (typeof body.subscriptionId !== 'undefined') fields.subscription_id = body.subscriptionId ? String(body.subscriptionId) : null;
    if (typeof body.subdeviceIds !== 'undefined') fields.subdevice_ids = JSON.stringify(Array.isArray(body.subdeviceIds) ? body.subdeviceIds.map(String) : []);
    if (typeof body.sharedAccessEnabled !== 'undefined') fields.shared_access_enabled = (typeof body.sharedAccessEnabled === 'boolean') ? (body.sharedAccessEnabled ? 1 : 0) : Number(body.sharedAccessEnabled ? 1 : 0);
    if (typeof body.planId !== 'undefined') fields.plan_id = body.planId ? String(body.planId) : null;
    const keys = Object.keys(fields);
    if (keys.length) {
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const params = keys.map(k => fields[k]);
      params.push(userId);
      await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, params);
    }
    const [rows] = await pool.query('SELECT id, name, email, phone, avatar, role, beta, tester, created_at, last_login, subscription_type, subscription_id, subdevice_ids, shared_access_enabled, plan_id, user_id FROM users WHERE id = ? LIMIT 1', [userId]);
    const u = rows[0];
    let subIds = [];
    try {
      if (u.subdevice_ids) {
        const parsed = typeof u.subdevice_ids === 'string' ? JSON.parse(u.subdevice_ids) : u.subdevice_ids;
        subIds = Array.isArray(parsed) ? parsed.map((s) => String(s)) : [];
      }
    } catch (_) { subIds = []; }
    const data = {
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
      subscriptionType: u.subscription_type || null,
      subscriptionId: u.subscription_id || null,
      subdeviceIds: subIds,
      sharedAccessEnabled: typeof u.shared_access_enabled === 'number' ? u.shared_access_enabled : (u.shared_access_enabled ? 1 : 0),
      planId: u.plan_id || null,
      userCode: u.user_id || null,
    };
    res.json({ success: true, data });
  } catch (err) {
    console.error('Admin updateUser error:', err);
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
    let sql = `
      SELECT 
        d.id,
        d.name,
        d.device_type AS deviceType,
        d.is_on AS isOn,
        d.brightness,
        d.mac_address AS macAddress,
        d.ip_address AS ipAddress,
        d.ssid AS ssid,
        d.last_seen AS lastSeen,
        d.firmware_version AS firmwareVersion,
        d.flow_rate AS flowRate,
        d.total_liters AS totalLiters,
        d.target AS target,
        d.is_connected AS isConnected,
        d.room_id AS roomId,
        r.name AS roomName,
        d.user_id AS userId,
        d.device1, d.device2, d.device3, d.device4, d.device5,
        COALESCE(MAX(sd.subscription_active), 0) AS subscriptionActive,
        MAX(sd.subscription_end_date) AS subscriptionEndDate,
        d.created_at
      FROM devices d
      LEFT JOIN device_users du ON du.device_id = d.id
      LEFT JOIN rooms r ON r.id = d.room_id
      LEFT JOIN subdevices sd ON sd.device_id = d.id
      WHERE (d.user_id = ? OR du.user_id = ?)
    `;
    const params = [userId, userId];
    if (roomId) { sql += ' AND d.room_id = ?'; params.push(roomId); }
    sql += ' GROUP BY d.id ORDER BY d.created_at DESC';
    const [rows] = await pool.query(sql, params);
    const data = rows.map((d) => ({
      id: d.id,
      name: d.name,
      deviceType: d.deviceType,
      isOn: !!d.isOn,
      brightness: d.brightness,
      macAddress: d.macAddress,
      ipAddress: d.ipAddress,
      ssid: d.ssid,
      lastSeen: d.lastSeen,
      firmwareVersion: d.firmwareVersion,
      flowRate: d.flowRate,
      totalLiters: d.totalLiters,
      target: d.target,
      isConnected: !!d.isConnected,
      roomId: d.roomId,
      roomName: d.roomName,
      userId: d.userId,
      device1: d.device1,
      device2: d.device2,
      device3: d.device3,
      device4: d.device4,
      device5: d.device5,
      subscriptionActive: Number(d.subscriptionActive || 0),
      subscriptionEndDate: d.subscriptionEndDate,
      created_at: d.created_at
    }));
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Admin getUserDevices error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: update device fields (owner or shared)
exports.updateDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const [rows] = await pool.query('SELECT * FROM devices WHERE id=? LIMIT 1', [deviceId]);
    if (!rows || !rows[0]) {
      return res.status(404).json({ message: 'Device not found' });
    }
    const body = req.body || {};
    const map = {};
    if (typeof body.name !== 'undefined') map.name = String(body.name || '');
    if (typeof body.deviceType !== 'undefined') map.device_type = String(body.deviceType || '');
    if (typeof body.macAddress !== 'undefined') map.mac_address = String(body.macAddress || '');
    if (typeof body.ip !== 'undefined') map.ip_address = String(body.ip || '');
    if (typeof body.ipAddress !== 'undefined') map.ip_address = String(body.ipAddress || '');
    if (typeof body.ssid !== 'undefined') map.ssid = String(body.ssid || '');
    if (typeof body.isConnected !== 'undefined') map.is_connected = (typeof body.isConnected === 'boolean') ? (body.isConnected ? 1 : 0) : Number(body.isConnected ? 1 : 0);
    if (typeof body.isOn !== 'undefined') map.is_on = (typeof body.isOn === 'boolean') ? (body.isOn ? 1 : 0) : Number(body.isOn ? 1 : 0);
    if (typeof body.brightness !== 'undefined') map.brightness = Number(body.brightness);
    if (typeof body.flowRate !== 'undefined') map.flow_rate = Number(body.flowRate);
    if (typeof body.totalLiters !== 'undefined') map.total_liters = Number(body.totalLiters);
    if (typeof body.target !== 'undefined') map.target = Number(body.target);
    if (typeof body.device1 !== 'undefined') map.device1 = (typeof body.device1 === 'boolean') ? (body.device1 ? 1 : 0) : Number(body.device1);
    if (typeof body.device2 !== 'undefined') map.device2 = (typeof body.device2 === 'boolean') ? (body.device2 ? 1 : 0) : Number(body.device2);
    if (typeof body.device3 !== 'undefined') map.device3 = (typeof body.device3 === 'boolean') ? (body.device3 ? 1 : 0) : Number(body.device3);
    if (typeof body.device4 !== 'undefined') map.device4 = (typeof body.device4 === 'boolean') ? (body.device4 ? 1 : 0) : Number(body.device4);
    if (typeof body.device5 !== 'undefined') map.device5 = (typeof body.device5 === 'boolean') ? (body.device5 ? 1 : 0) : Number(body.device5);
    if (typeof body.firmwareVersion !== 'undefined') map.firmware_version = String(body.firmwareVersion || '');
    if (typeof body.userId !== 'undefined') map.user_id = body.userId ? Number(body.userId) : null;
    if (typeof body.room !== 'undefined') map.room_id = body.room ? Number(body.room) : null;
    if (typeof body.lastSeen !== 'undefined') map.last_seen = String(body.lastSeen || '');
    if (typeof body.createdAt !== 'undefined') map.created_at = String(body.createdAt || '');
    if (typeof body.deviceId !== 'undefined') map.deviceId = String(body.deviceId || '');
    if (typeof body.subdevice1 !== 'undefined') map.subdevice1 = String(body.subdevice1 || '');
    if (typeof body.subdevice2 !== 'undefined') map.subdevice2 = String(body.subdevice2 || '');
    if (typeof body.subdevice3 !== 'undefined') map.subdevice3 = String(body.subdevice3 || '');
    if (typeof body.subdevice4 !== 'undefined') map.subdevice4 = String(body.subdevice4 || '');
    if (typeof body.subdevice5 !== 'undefined') map.subdevice5 = String(body.subdevice5 || '');
    const keys = Object.keys(map);
    if (keys.length) {
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const params = keys.map(k => map[k]);
      params.push(deviceId);
      await pool.query(`UPDATE devices SET ${setClause} WHERE id = ?`, params);
    }
    const [updatedRows] = await pool.query('SELECT * FROM devices WHERE id=? LIMIT 1', [deviceId]);
    const d = updatedRows[0];
    const data = {
      id: d.id,
      name: d.name,
      deviceType: d.device_type,
      macAddress: d.mac_address,
      ipAddress: d.ip_address,
      ssid: d.ssid,
      isConnected: !!d.is_connected,
      isOn: !!d.is_on,
      brightness: d.brightness,
      flowRate: d.flow_rate,
      totalLiters: d.total_laters || d.total_liters,
      target: d.target,
      device1: d.device1,
      device2: d.device2,
      device3: d.device3,
      device4: d.device4,
      device5: d.device5,
      firmwareVersion: d.firmware_version,
      lastSeen: d.last_seen,
      createdAt: d.created_at,
      userId: d.user_id,
      roomId: d.room_id,
      deviceId: d.deviceId,
      subdevice1: d.subdevice1,
      subdevice2: d.subdevice2,
      subdevice3: d.subdevice3,
      subdevice4: d.subdevice4,
      subdevice5: d.subdevice5
    };
    res.json({ success: true, data });
  } catch (err) {
    console.error('Admin updateDevice error:', err);
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
