const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

class User {
  constructor({ id, name, email, password, avatar, role, phone, beta, tester, created_at, last_login, subdevice_ids, subscription_id, plan_id, user_id }) {
    this._id = id; // keep _id for controller compatibility
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.avatar = avatar;
    this.role = role || 'user';
    this.phone = phone || null;
    this.beta = typeof beta === 'number' ? beta : (beta ? 1 : 0);
    this.tester = typeof tester === 'number' ? tester : (tester ? 1 : 0);
    this.createdAt = created_at;
    this.lastLogin = last_login;
    this.subscriptionId = subscription_id ? String(subscription_id) : null;
    this.planId = plan_id ? String(plan_id) : null;
    this.userIdCode = user_id ? String(user_id) : null;
    try {
      if (Array.isArray(subdevice_ids)) {
        this.subdeviceIds = subdevice_ids.map(v => String(v));
      } else if (typeof subdevice_ids === 'string') {
        const parsed = JSON.parse(subdevice_ids);
        this.subdeviceIds = Array.isArray(parsed) ? parsed.map(v => String(v)) : [];
      } else if (subdevice_ids && typeof subdevice_ids === 'object') {
        this.subdeviceIds = Array.isArray(subdevice_ids) ? subdevice_ids.map(v => String(v)) : [];
      } else {
        this.subdeviceIds = [];
      }
    } catch (_) {
      this.subdeviceIds = [];
    }
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
    const [rows] = await pool.query('SELECT id,name,email,avatar,role,phone,beta,tester,created_at,last_login,subdevice_ids,subscription_id,plan_id,user_id FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? new User(rows[0]) : null;
  }

  static async findByIdAndUpdate(id, fields) {
    const keys = Object.keys(fields).filter(k => ['name','email','avatar','password','lastLogin','role','phone','beta','tester','subdeviceIds','subscriptionId','planId'].includes(k));
    if (keys.length === 0) {
      return await User.findById(id);
    }
    const updates = [];
    const params = [];
    for (const key of keys) {
      let col = key === 'lastLogin' ? 'last_login' : key === 'createdAt' ? 'created_at' : key;
      if (key === 'subdeviceIds') col = 'subdevice_ids';
      if (key === 'subscriptionId') col = 'subscription_id';
      if (key === 'planId') col = 'plan_id';
      updates.push(`${col} = ?`);
      if (key === 'subdeviceIds') {
        const val = Array.isArray(fields[key]) ? fields[key] : [];
        params.push(JSON.stringify(val));
      } else {
        params.push(fields[key]);
      }
    }
    params.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return await User.findById(id);
  }

  async save() {
    if (!this._id) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(this.password, salt);
      const generatedPlanId = (this.planId && String(this.planId).length === 5) ? String(this.planId) : String(Math.floor(10000 + Math.random() * 90000));
      let generatedUserId = (this.userIdCode && String(this.userIdCode).length === 5) ? String(this.userIdCode) : null;
      if (!generatedUserId) {
        for (let i = 0; i < 5; i++) {
          const candidate = String(Math.floor(10000 + Math.random() * 90000));
          const [rows] = await pool.query('SELECT id FROM users WHERE user_id = ? LIMIT 1', [candidate]);
          if (!rows || !rows[0]) { generatedUserId = candidate; break; }
        }
        if (!generatedUserId) generatedUserId = String(Math.floor(10000 + Math.random() * 90000));
      }
      const [res] = await pool.query(
        'INSERT INTO users (name,email,password,avatar,role,phone,user_id,plan_id,subdevice_ids,subscription_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)',
        [this.name, this.email, hashed, this.avatar || null, this.role || 'user', this.phone || null, generatedUserId, generatedPlanId, JSON.stringify(this.subdeviceIds || []), this.subscriptionId || null]
      );
      this._id = res.insertId;
      this.id = res.insertId;
      this.planId = generatedPlanId;
      this.userIdCode = generatedUserId;
      return this;
    } else {
      const [res] = await pool.query(
        'UPDATE users SET name=?, email=?, avatar=?, role=?, phone=?, user_id=?, plan_id=?, subdevice_ids=?, subscription_id=?, last_login=? WHERE id=?',
        [this.name, this.email, this.avatar || null, this.role || 'user', this.phone || null, this.userIdCode || null, this.planId || null, JSON.stringify(this.subdeviceIds || []), this.subscriptionId || null, this.lastLogin || null, this._id]
      );
      return this;
    }
  }
}

module.exports = User;
