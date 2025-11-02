const { pool } = require('../config/db');

class Address {
  constructor(row) {
    this._id = row.id; this.id = row.id;
    this.user = row.user_id;
    this.name = row.name;
    this.phone = row.phone;
    this.addressLine1 = row.address_line1;
    this.addressLine2 = row.address_line2;
    this.city = row.city;
    this.state = row.state;
    this.zipCode = row.zip_code;
    this.country = row.country;
    this.isDefault = !!row.is_default;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
  }

  static async find(filter = {}) {
    const where = [];
    const params = [];
    if (filter.user) { where.push('user_id=?'); params.push(filter.user); }
    const [rows] = await pool.query(`SELECT * FROM addresses${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY is_default DESC, created_at DESC`, params);
    return rows.map(r => new Address(r));
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM addresses WHERE id=? LIMIT 1', [id]);
    return rows[0] ? new Address(rows[0]) : null;
  }

  static async create(data) {
    const [res] = await pool.query(
      'INSERT INTO addresses (user_id,name,phone,address_line1,address_line2,city,state,zip_code,country,is_default) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [data.user, data.name, data.phone, data.addressLine1, data.addressLine2 || null, data.city, data.state, data.zipCode, data.country, data.isDefault ? 1 : 0]
    );
    return await Address.findById(res.insertId);
  }

  static async findByIdAndUpdate(id, data) {
    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push('name=?'); params.push(data.name); }
    if (data.phone !== undefined) { updates.push('phone=?'); params.push(data.phone); }
    if (data.addressLine1 !== undefined) { updates.push('address_line1=?'); params.push(data.addressLine1); }
    if (data.addressLine2 !== undefined) { updates.push('address_line2=?'); params.push(data.addressLine2 || null); }
    if (data.city !== undefined) { updates.push('city=?'); params.push(data.city); }
    if (data.state !== undefined) { updates.push('state=?'); params.push(data.state); }
    if (data.zipCode !== undefined) { updates.push('zip_code=?'); params.push(data.zipCode); }
    if (data.country !== undefined) { updates.push('country=?'); params.push(data.country); }
    if (data.isDefault !== undefined) { updates.push('is_default=?'); params.push(data.isDefault ? 1 : 0); }
    if (updates.length) {
      updates.push('updated_at=CURRENT_TIMESTAMP');
      params.push(id);
      await pool.query(`UPDATE addresses SET ${updates.join(', ')} WHERE id=?`, params);
    }
    return await Address.findById(id);
  }

  async remove() {
    await pool.query('DELETE FROM addresses WHERE id=?', [this.id]);
  }

  static async setDefault(userId, id) {
    // Clear previous defaults
    await pool.query('UPDATE addresses SET is_default=0 WHERE user_id=?', [userId]);
    // Set new default
    await pool.query('UPDATE addresses SET is_default=1 WHERE id=? AND user_id=?', [id, userId]);
    return await Address.findById(id);
  }
}

module.exports = Address;