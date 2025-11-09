const { pool } = require('../config/db');

// @desc    List users for authenticated clients (non-admin)
// @route   GET /voodoo/api/users
// @access  Private
exports.listUsers = async (req, res) => {
  try {
    const meId = req.user.id;
    const search = String(req.query.search || '').trim();
    let sql = `SELECT id, name, email, avatar, role FROM users WHERE id <> ?`;
    let params = [meId];
    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name ASC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    const data = rows.map(u => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar || null, role: u.role }));
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

