const { pool } = require('../config/db');

class Order {
  constructor(row){
    this._id = row.id; this.id = row.id;
    this.user = row.user_id;
    this.paymentId = row.payment_id;
    this.amount = Number(row.amount);
    this.status = row.status;
    this.subscriptionType = row.subscription_type || null;
    this.createdAt = row.created_at;
    this.shippingAddress = {
      name: row.ship_name,
      email: row.ship_email,
      phone: row.ship_phone,
      address: row.ship_address,
      city: row.ship_city,
      state: row.ship_state,
      zipCode: row.ship_zip
    };
  }

  async save(){
    const [res] = await pool.query(
      `INSERT INTO orders (user_id,payment_id,amount,status,subscription_type,ship_name,ship_email,ship_phone,ship_address,ship_city,ship_state,ship_zip)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [this.user, this.paymentId || null, this.amount, this.status || 'pending', this.subscriptionType || null,
       this.shippingAddress?.name || null,
       this.shippingAddress?.email || null,
       this.shippingAddress?.phone || null,
       this.shippingAddress?.address || null,
       this.shippingAddress?.city || null,
       this.shippingAddress?.state || null,
       this.shippingAddress?.zipCode || null]
    );
    this.id = res.insertId; this._id = res.insertId;
    return this;
  }

  static async addItems(orderId, items){
    if (!items || !items.length) return;
    const values = items.map(i => [orderId, i.product, i.quantity || 1]);
    await pool.query('INSERT INTO order_items (order_id,product_id,quantity) VALUES ?', [values]);
  }
}

module.exports = Order;
