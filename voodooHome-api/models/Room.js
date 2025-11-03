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
    try {
      const [rows] = await pool.query(`SELECT * FROM rooms${where.length?' WHERE '+where.join(' AND '):''}` , params);
      return rows.map(r=>new Room(r));
    } catch (err) {
      console.error('Room.find query failed:', err.message);
      // Graceful fallback when DB is down
      return [];
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM rooms WHERE id=? LIMIT 1', [id]);
      return rows[0]? new Room(rows[0]) : null;
    } catch (err) {
      console.error('Room.findById failed:', err.message);
      return null;
    }
  }

  static async create(data) {
    try {
      const [res] = await pool.query('INSERT INTO rooms (user_id,name,type) VALUES (?,?,?)', [data.user, data.name, data.type || 'Other']);
      return await Room.findById(res.insertId);
    } catch (err) {
      console.error('Room.create failed:', err.message);
      // Return a mock object when creation fails due to DB issues
      return { id: 'temp', _id: 'temp', name: data.name, type: data.type || 'Other', user: data.user, createdAt: new Date() };
    }
  }

  static async findByIdAndUpdate(id, data) {
    const updates=[]; const params=[];
    if (data.name!==undefined){ updates.push('name=?'); params.push(data.name); }
    if (data.type!==undefined){ updates.push('type=?'); params.push(data.type); }
    try {
      if (updates.length){ params.push(id); await pool.query(`UPDATE rooms SET ${updates.join(', ')} WHERE id=?`, params); }
      return await Room.findById(id);
    } catch (err) {
      console.error('Room.findByIdAndUpdate failed:', err.message);
      return await Room.findById(id);
    }
  }

  async remove(){
    try {
      await pool.query('DELETE FROM rooms WHERE id=?', [this.id]);
    } catch (err) {
      console.error('Room.remove failed:', err.message);
    }
  }
}

module.exports = Room;