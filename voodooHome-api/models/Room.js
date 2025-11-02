const { pool } = require('../config/db');

class Room {
  constructor(row) {
    this._id = row.id;
    this.id = row.id;
    this.name = row.name;
    this.type = row.type;
    this.user = row.user_id;
    this.createdAt = row.created_at;
  }

  static async find(filter={}) {
    const where=[]; const params=[];
    if (filter.user) { where.push('user_id=?'); params.push(filter.user); }
    const [rows] = await pool.query(`SELECT * FROM rooms${where.length?' WHERE '+where.join(' AND '):''}` , params);
    return rows.map(r=>new Room(r));
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM rooms WHERE id=? LIMIT 1', [id]);
    return rows[0]? new Room(rows[0]) : null;
  }

  static async create(data) {
    const [res] = await pool.query('INSERT INTO rooms (user_id,name,type) VALUES (?,?,?)', [data.user, data.name, data.type || 'Other']);
    return await Room.findById(res.insertId);
  }

  static async findByIdAndUpdate(id, data) {
    const updates=[]; const params=[];
    if (data.name!==undefined){ updates.push('name=?'); params.push(data.name); }
    if (data.type!==undefined){ updates.push('type=?'); params.push(data.type); }
    if (updates.length){ params.push(id); await pool.query(`UPDATE rooms SET ${updates.join(', ')} WHERE id=?`, params); }
    return await Room.findById(id);
  }

  async remove(){
    await pool.query('DELETE FROM rooms WHERE id=?', [this.id]);
  }
}

module.exports = Room;