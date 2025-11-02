const { pool } = require('../config/db');

class Product {
  constructor(row) {
    this._id = row.id;
    this.id = row.id;
    this.name = row.name;
    this.description = row.description;
    this.price = Number(row.price);
    this.category = row.category;
    this.imageUrl = row.image_url;
    this.inStock = !!row.in_stock;
    this.rating = Number(row.rating);
    this.createdAt = row.created_at;
  }

  static async countDocuments() {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM products');
    return rows[0].cnt;
  }

  static async find(filter = {}) {
    const where = [];
    const params = [];
    let skip = 0;
    let limit = null;
    
    for (const [k,v] of Object.entries(filter)) {
      if (k === 'skip') {
        skip = v;
      } else if (k === 'limit') {
        limit = v;
      } else {
        const col = k === 'inStock' ? 'in_stock' : k === 'imageUrl' ? 'image_url' : k;
        where.push(`${col} = ?`);
        params.push(v);
      }
    }
    
    let sql = `SELECT * FROM products${where.length? ' WHERE '+where.join(' AND '):''}`;
    if (limit) {
      sql += ` LIMIT ${limit}`;
      if (skip > 0) {
        sql += ` OFFSET ${skip}`;
      }
    }
    
    const [rows] = await pool.query(sql, params);
    return rows.map(r => new Product(r));
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? new Product(rows[0]) : null;
  }

  static async create(data) {
    const [res] = await pool.query(
      'INSERT INTO products (name,description,price,category,image_url,in_stock,rating) VALUES (?,?,?,?,?,?,0)',
      [data.name, data.description, data.price, data.category || 'Other', data.imageUrl || null, data.inStock ? 1 : 1]
    );
    return await Product.findById(res.insertId);
  }

  static async findByIdAndUpdate(id, data) {
    const fields = {
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      image_url: data.imageUrl,
      in_stock: typeof data.inStock === 'boolean' ? (data.inStock?1:0) : undefined,
      rating: data.rating
    };
    const updates = [];
    const params = [];
    for (const [k,v] of Object.entries(fields)) {
      if (v !== undefined) { updates.push(`${k}=?`); params.push(v); }
    }
    if (updates.length) {
      params.push(id);
      await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return await Product.findById(id);
  }

  async remove() {
    await pool.query('DELETE FROM products WHERE id = ?', [this.id]);
    await pool.query('DELETE FROM product_reviews WHERE product_id = ?', [this.id]);
  }
}

module.exports = Product;