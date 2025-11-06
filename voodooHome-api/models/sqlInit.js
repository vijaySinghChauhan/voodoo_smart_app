const { pool } = require('../config/db');

async function initSqlSchema() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME NULL
    )`,
    `CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) DEFAULT 'Other',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS devices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      room_id INT NULL,
      name VARCHAR(100) NOT NULL,
      device_type VARCHAR(50) NOT NULL,
      mac_address VARCHAR(100) UNIQUE NOT NULL,
      ip_address VARCHAR(100),
      ssid VARCHAR(100),
      is_connected TINYINT(1) DEFAULT 0,
      is_on TINYINT(1) DEFAULT 0,
      brightness INT DEFAULT 100,
      target INT NULL,
      device1 INT NULL,
      device2 INT NULL,
      device3 INT NULL,
      device4 INT NULL,
      device5 INT NULL,
      firmware_version VARCHAR(50),
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(50) DEFAULT 'Other',
      image_url VARCHAR(255),
      in_stock TINYINT(1) DEFAULT 1,
      rating DECIMAL(3,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS product_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id INT NOT NULL,
      text TEXT NOT NULL,
      rating INT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS chats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      user_id INT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      payment_id VARCHAR(100),
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      ship_name VARCHAR(100),
      ship_email VARCHAR(150),
      ship_phone VARCHAR(30),
      ship_address VARCHAR(255),
      ship_city VARCHAR(100),
      ship_state VARCHAR(100),
      ship_zip VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE IF NOT EXISTS addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255),
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      zip_code VARCHAR(20) NOT NULL,
      country VARCHAR(100) NOT NULL,
      is_default TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ];

  for (const sql of queries) {
    await pool.query(sql);
  }
  // Attempt to relax existing schema if already created with NOT NULL
  try {
    await pool.query('ALTER TABLE devices MODIFY COLUMN user_id INT NULL');
  } catch (e) {
    // ignore if already NULL or lacks permissions
  }
  // Attempt to add calibration/target columns if missing
  const alterStatements = [
    'ALTER TABLE devices ADD COLUMN target INT NULL',
    'ALTER TABLE devices ADD COLUMN device1 INT NULL',
    'ALTER TABLE devices ADD COLUMN device2 INT NULL',
    'ALTER TABLE devices ADD COLUMN device3 INT NULL',
    'ALTER TABLE devices ADD COLUMN device4 INT NULL',
    'ALTER TABLE devices ADD COLUMN device5 INT NULL',
  ];
  for (const stmt of alterStatements) {
    try { await pool.query(stmt); } catch (e) { /* ignore if column exists */ }
  }
  console.log('✅ SQL tables initialized');
}

module.exports = { initSqlSchema };
