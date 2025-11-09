const { pool } = require('../config/db');

class Subscription {
  constructor({ id, user_id, plan, price, status, start_date, end_date, auto_renew, created_at }) {
    this.id = id;
    this.user = user_id;
    this.plan = plan;
    this.price = price;
    this.status = status;
    this.startDate = start_date;
    this.endDate = end_date;
    this.autoRenew = !!auto_renew;
    this.createdAt = created_at;
  }

  static async create({ userId, plan, price, status = 'active', startDate = new Date(), endDate = null, autoRenew = true }) {
    const [res] = await pool.query(
      'INSERT INTO subscriptions (user_id, plan, price, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, plan, price, status, startDate, endDate, autoRenew ? 1 : 0]
    );
    const [rows] = await pool.query('SELECT * FROM subscriptions WHERE id=?', [res.insertId]);
    return new Subscription(rows[0]);
  }

  static async listByUser(userId) {
    const [rows] = await pool.query('SELECT * FROM subscriptions WHERE user_id=? ORDER BY start_date DESC', [userId]);
    return rows.map(r => new Subscription(r));
  }
}

module.exports = Subscription;
