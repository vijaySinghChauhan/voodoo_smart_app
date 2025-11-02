const { pool } = require('../config/db');

class Chat {
  constructor(row){
    this._id = row.id; this.id=row.id;
    this.room = row.room_id;
    this.user = row.user_id;
    this.text = row.text;
    this.createdAt = row.created_at;
  }

  static async find(filter={}){
    const where=[]; const params=[];
    if (filter.room){ where.push('c.room_id=?'); params.push(filter.room); }
    if (filter.user){ where.push('c.user_id=?'); params.push(filter.user); }
    const sql = `SELECT c.*, u.name as user_name, u.email as user_email FROM chats c LEFT JOIN users u ON u.id = c.user_id${where.length? ' WHERE '+where.join(' AND '):''} ORDER BY c.created_at ASC`;
    const [rows] = await pool.query(sql, params);
    return rows.map(r=>{
      const msg = new Chat(r);
      msg.user = { id: r.user_id, name: r.user_name, email: r.user_email };
      return msg;
    });
  }

  static async create(data){
    const [res] = await pool.query('INSERT INTO chats (room_id,user_id,text) VALUES (?,?,?)',[data.room || null, data.user || null, data.text]);
    const [rows] = await pool.query('SELECT * FROM chats WHERE id=?', [res.insertId]);
    return new Chat(rows[0]);
  }
}

module.exports = Chat;