const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

class User {
  constructor({ id, name, email, password, avatar, role, created_at, last_login }) {
    this._id = id; // keep _id for controller compatibility
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.avatar = avatar;
    this.role = role || 'user';
    this.createdAt = created_at;
    this.lastLogin = last_login;
  }

  static async findOne({ email }) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ? new User(rows[0]) : null;
  }

  static async findOneWithPassword(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ? new User(rows[0]) : null;
  }

  static async findByIdWithPassword(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? new User(rows[0]) : null;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT id,name,email,avatar,role,created_at,last_login FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? new User(rows[0]) : null;
  }

  static async findByIdAndUpdate(id, fields) {
    const keys = Object.keys(fields).filter(k => ['name','email','avatar','password','lastLogin','role'].includes(k));
    if (keys.length === 0) {
      return await User.findById(id);
    }
    const updates = [];
    const params = [];
    for (const key of keys) {
      const col = key === 'lastLogin' ? 'last_login' : key === 'createdAt' ? 'created_at' : key;
      updates.push(`${col} = ?`);
      params.push(fields[key]);
    }
    params.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return await User.findById(id);
  }

  async save() {
    if (!this._id) {
      // insert
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(this.password, salt);
      const [res] = await pool.query(
        'INSERT INTO users (name,email,password,avatar,role,created_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)',
        [this.name, this.email, hashed, this.avatar || null, this.role || 'user']
      );
      this._id = res.insertId;
      this.id = res.insertId;
      return this;
    } else {
      // update
      const [res] = await pool.query(
        'UPDATE users SET name=?, email=?, avatar=?, role=?, last_login=? WHERE id=?',
        [this.name, this.email, this.avatar || null, this.role || 'user', this.lastLogin || null, this._id]
      );
      return this;
    }
  }
}

module.exports = User;
