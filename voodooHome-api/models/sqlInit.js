const { pool } = require('../config/db');

async function initSqlSchema() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(255),
      phone VARCHAR(30),
      user_id VARCHAR(5),
      plan_id VARCHAR(5),
      subscription_type VARCHAR(50),
      subscription_id VARCHAR(100),
      subdevice_ids JSON NULL,
      beta TINYINT(1) NOT NULL DEFAULT 0,
      tester TINYINT(1) NOT NULL DEFAULT 1,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
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
      brightness INT DEFAULT 1,
      flow_rate DECIMAL(10,3) DEFAULT 0,
      total_liters DECIMAL(10,3) DEFAULT 0,
      target INT NULL,
      device1 INT NULL,
      device2 INT NULL,
      device3 INT NULL,
      device4 INT NULL,
      device5 INT NULL,
      deviceId VARCHAR(5) UNIQUE,
      subdevice1 VARCHAR(5) UNIQUE,
      subdevice2 VARCHAR(5) UNIQUE,
      subdevice3 VARCHAR(5) UNIQUE,
      subdevice4 VARCHAR(5) UNIQUE,
      subdevice5 VARCHAR(5) UNIQUE,
      firmware_version VARCHAR(50),
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )`,
    `CREATE TABLE IF NOT EXISTS device_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id INT NOT NULL,
      user_id INT NOT NULL,
      access_level VARCHAR(20) NOT NULL DEFAULT 'read-write',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY uniq_device_user (device_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS subdevices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id INT NOT NULL,
      subkey VARCHAR(50) NOT NULL,
      uuid VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(100),
      type VARCHAR(50),
      subscription_active TINYINT(1) DEFAULT 0,
      subscription_end_date DATETIME NULL,
      plan_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      UNIQUE KEY uniq_device_subkey (device_id, subkey)
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
      subscription_type VARCHAR(50),
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
    ,
    `CREATE TABLE IF NOT EXISTS logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      event_type VARCHAR(50) NOT NULL,
      screen VARCHAR(100) NULL,
      action VARCHAR(150) NULL,
      metadata TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_time (user_id, created_at),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Subscriptions table
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      plan VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      subscription_id VARCHAR(100) NULL,
      subscription_type VARCHAR(50) NULL,
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_date DATETIME NULL,
      auto_renew TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    // Subscription plan catalog
    `CREATE TABLE IF NOT EXISTS subscription_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      price DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      plan_interval VARCHAR(20) NOT NULL DEFAULT 'month',
      duration_days INT NOT NULL DEFAULT 30,
      scope ENUM('subdevice','bundle') NOT NULL DEFAULT 'bundle',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS subscription_plan_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      feature_key VARCHAR(50) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
      UNIQUE KEY uniq_plan_feature (plan_id, feature_key)
    )`
  ];

  for (const sql of queries) {
    await pool.query(sql);
  }
  // Add role column to users if missing
  try {
    await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'");
  } catch (e) {
    // ignore if exists
  }
  // Add phone column to users if missing
  try {
    await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL");
  } catch (e) {
    // ignore if exists
  }
  // Add subscription_type column if missing
  try {
    await pool.query("ALTER TABLE users ADD COLUMN subscription_type VARCHAR(50) NULL");
  } catch (e) {
    // ignore if exists
  }
  try {
    await pool.query("ALTER TABLE users ADD COLUMN subscription_id VARCHAR(100) NULL");
  } catch (e) {
    // ignore if exists
  }
  try {
    await pool.query("ALTER TABLE users ADD COLUMN user_id VARCHAR(5) NULL");
  } catch (e) {
    // ignore if exists
  }
  try {
    await pool.query("ALTER TABLE users ADD COLUMN plan_id VARCHAR(5) NULL");
  } catch (e) {
    // ignore if exists
  }
  try {
    await pool.query("ALTER TABLE users ADD UNIQUE INDEX idx_users_user_id (user_id)");
  } catch (e) {
    // ignore if exists
  }
  try {
    await pool.query("ALTER TABLE users ADD UNIQUE INDEX idx_users_plan_id (plan_id)");
  } catch (e) {
    // ignore if exists
  }
  // Add subdevice_ids JSON column if missing
  try {
    await pool.query("ALTER TABLE users ADD COLUMN subdevice_ids JSON NULL");
  } catch (e) {
    // ignore if exists
  }
  // Add beta/tester columns to users if missing
  try {
    await pool.query('ALTER TABLE users ADD COLUMN beta TINYINT(1) NOT NULL DEFAULT 0');
  } catch (e) {
    // ignore if exists
  }
  try {
    await pool.query('ALTER TABLE users ADD COLUMN tester TINYINT(1) NOT NULL DEFAULT 1');
  } catch (e) {
    // ignore if exists
  }
  // Add shared access toggle to users if missing
  try {
    await pool.query('ALTER TABLE users ADD COLUMN shared_access_enabled TINYINT(1) NOT NULL DEFAULT 1');
  } catch (e) {
    // ignore if exists
  }
  // Seed admin role based on env ADMIN_EMAIL
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await pool.query('UPDATE users SET role=\'admin\' WHERE email = ?', [adminEmail]);
    }
  } catch (e) {
    // ignore
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
    'ALTER TABLE devices ADD COLUMN deviceId VARCHAR(5) UNIQUE',
    'ALTER TABLE devices ADD COLUMN subdevice1 VARCHAR(5) UNIQUE',
    'ALTER TABLE devices ADD COLUMN subdevice2 VARCHAR(5) UNIQUE',
    'ALTER TABLE devices ADD COLUMN subdevice3 VARCHAR(5) UNIQUE',
    'ALTER TABLE devices ADD COLUMN subdevice4 VARCHAR(5) UNIQUE',
    'ALTER TABLE devices ADD COLUMN subdevice5 VARCHAR(5) UNIQUE',
    'ALTER TABLE devices ADD COLUMN flow_rate DECIMAL(10,3) DEFAULT 0',
    'ALTER TABLE devices ADD COLUMN total_liters DECIMAL(10,3) DEFAULT 0',
    // Chat enhancements: allow string-based rooms (e.g., dm_1_2, general)
    'ALTER TABLE chats ADD COLUMN room_key VARCHAR(100) NULL',
    'ALTER TABLE chats ADD INDEX idx_room_key (room_key)',
  ];
  for (const stmt of alterStatements) {
    try { await pool.query(stmt); } catch (e) { /* ignore if column exists */ }
  }
  // Ensure subscription_type exists on orders
  try {
    await pool.query('ALTER TABLE orders ADD COLUMN subscription_type VARCHAR(50) NULL');
  } catch (e) {
    // ignore if exists
  }
  try {
    await pool.query('ALTER TABLE subscriptions ADD COLUMN subscription_type VARCHAR(50) NULL');
  } catch (e) {
  }
  try {
    await pool.query('ALTER TABLE subscriptions ADD COLUMN subscription_id VARCHAR(100) NULL');
  } catch (e) {
  }
  try {
    await pool.query("ALTER TABLE subscription_plans CHANGE COLUMN `interval` plan_interval VARCHAR(20) NOT NULL DEFAULT 'month'");
  } catch (e) {
  }
  try {
    const genCode = async (col) => {
      while (true) {
        const n = String(Math.floor(10000 + Math.random() * 90000));
        const [rows] = await pool.query(`SELECT 1 FROM devices WHERE ${col}=? LIMIT 1`, [n]);
        if (!rows.length) return n;
      }
    };
    const [rowsMissingDevice] = await pool.query('SELECT id FROM devices WHERE deviceId IS NULL OR deviceId=""');
    for (const r of rowsMissingDevice) {
      const code = await genCode('deviceId');
      await pool.query('UPDATE devices SET deviceId=? WHERE id=?', [code, r.id]);
    }
    const [rowsMissingSub1] = await pool.query('SELECT id FROM devices WHERE subdevice1 IS NULL OR subdevice1=""');
    for (const r of rowsMissingSub1) {
      const code = await genCode('subdevice1');
      await pool.query('UPDATE devices SET subdevice1=? WHERE id=?', [code, r.id]);
    }
    const [rowsMissingSub2] = await pool.query('SELECT id FROM devices WHERE subdevice2 IS NULL OR subdevice2=""');
    for (const r of rowsMissingSub2) {
      const code = await genCode('subdevice2');
      await pool.query('UPDATE devices SET subdevice2=? WHERE id=?', [code, r.id]);
    }
    const [rowsMissingSub3] = await pool.query('SELECT id FROM devices WHERE subdevice3 IS NULL OR subdevice3=""');
    for (const r of rowsMissingSub3) {
      const code = await genCode('subdevice3');
      await pool.query('UPDATE devices SET subdevice3=? WHERE id=?', [code, r.id]);
    }
    const [rowsMissingSub4] = await pool.query('SELECT id FROM devices WHERE subdevice4 IS NULL OR subdevice4=""');
    for (const r of rowsMissingSub4) {
      const code = await genCode('subdevice4');
      await pool.query('UPDATE devices SET subdevice4=? WHERE id=?', [code, r.id]);
    }
    const [rowsMissingSub5] = await pool.query('SELECT id FROM devices WHERE subdevice5 IS NULL OR subdevice5=""');
    for (const r of rowsMissingSub5) {
      const code = await genCode('subdevice5');
      await pool.query('UPDATE devices SET subdevice5=? WHERE id=?', [code, r.id]);
    }
  } catch (e) {}
  // Backfill room_key from legacy numeric room_id if present
  try {
    await pool.query("UPDATE chats SET room_key = CAST(room_id AS CHAR) WHERE room_key IS NULL AND room_id IS NOT NULL");
  } catch (e) {
    // ignore if update fails or table empty
  }
  // Seed subscription plans and permutations if empty
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM subscription_plans');
    const cnt = rows && rows[0] ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      const features = ['motor', 'plants', 'dog', 'ac'];
      // Helper to insert plan and items
      const addPlan = async (code, name, price, interval, durationDays, scope, feats) => {
        const [res] = await pool.query(
          'INSERT INTO subscription_plans (code, name, price, plan_interval, duration_days, scope) VALUES (?,?,?,?,?,?)',
          [code, name, price, interval, durationDays, scope]
        );
        const planId = res.insertId;
        for (const fk of feats) {
          await pool.query(
            'INSERT INTO subscription_plan_items (plan_id, feature_key, quantity) VALUES (?,?,1)',
            [planId, fk]
          );
        }
      };
      // Singles
      await addPlan('single_motor_m', 'Motor (Monthly)', 99.0, 'month', 30, 'subdevice', ['motor']);
      await addPlan('single_plants_m', 'Plants (Monthly)', 99.0, 'month', 30, 'subdevice', ['plants']);
      await addPlan('single_dog_m', 'Dog Feed (Monthly)', 99.0, 'month', 30, 'subdevice', ['dog']);
      await addPlan('single_ac_m', 'AC Control (Monthly)', 99.0, 'month', 30, 'subdevice', ['ac']);
      // Duos
      await addPlan('combo_motor_plants_m', 'Motor + Plants (Monthly)', 179.0, 'month', 30, 'bundle', ['motor','plants']);
      await addPlan('combo_motor_dog_m', 'Motor + Dog (Monthly)', 179.0, 'month', 30, 'bundle', ['motor','dog']);
      await addPlan('combo_motor_ac_m', 'Motor + AC (Monthly)', 179.0, 'month', 30, 'bundle', ['motor','ac']);
      await addPlan('combo_plants_dog_m', 'Plants + Dog (Monthly)', 179.0, 'month', 30, 'bundle', ['plants','dog']);
      await addPlan('combo_plants_ac_m', 'Plants + AC (Monthly)', 179.0, 'month', 30, 'bundle', ['plants','ac']);
      await addPlan('combo_dog_ac_m', 'Dog + AC (Monthly)', 179.0, 'month', 30, 'bundle', ['dog','ac']);
      // Triples
      await addPlan('combo_motor_plants_dog_m', 'Motor + Plants + Dog (Monthly)', 249.0, 'month', 30, 'bundle', ['motor','plants','dog']);
      await addPlan('combo_motor_plants_ac_m', 'Motor + Plants + AC (Monthly)', 249.0, 'month', 30, 'bundle', ['motor','plants','ac']);
      await addPlan('combo_motor_dog_ac_m', 'Motor + Dog + AC (Monthly)', 249.0, 'month', 30, 'bundle', ['motor','dog','ac']);
      await addPlan('combo_plants_dog_ac_m', 'Plants + Dog + AC (Monthly)', 249.0, 'month', 30, 'bundle', ['plants','dog','ac']);
      // All
      await addPlan('all_features_m', 'All features (Monthly)', 299.0, 'month', 30, 'bundle', features);
      // Annual variants (optional seeds)
      await addPlan('single_motor_y', 'Motor (Annual)', 999.0, 'year', 365, 'subdevice', ['motor']);
      await addPlan('all_features_y', 'All features (Annual)', 2999.0, 'year', 365, 'bundle', features);
    }
    // Ensure subdevice-count permutations exist (idempotent)
    const addSimplePlanIfNotExists = async (code, name, price, interval, durationDays, scope) => {
      await pool.query(
        'INSERT IGNORE INTO subscription_plans (code, name, price, plan_interval, duration_days, scope) VALUES (?,?,?,?,?,?)',
        [code, name, price, interval, durationDays, scope]
      );
    };
    await addSimplePlanIfNotExists('sub_1_m', '1 Subdevice Monthly', 49.0, 'month', 30, 'subdevice');
    await addSimplePlanIfNotExists('sub_1_y', '1 Subdevice Annual', 499.0, 'year', 365, 'subdevice');
    await addSimplePlanIfNotExists('sub_2_m', '2 Subdevices Monthly', 89.0, 'month', 30, 'subdevice');
    await addSimplePlanIfNotExists('sub_2_y', '2 Subdevices Annual', 899.0, 'year', 365, 'subdevice');
    await addSimplePlanIfNotExists('sub_3_m', '3 Subdevices Monthly', 129.0, 'month', 30, 'subdevice');
    await addSimplePlanIfNotExists('sub_3_y', '3 Subdevices Annual', 1299.0, 'year', 365, 'subdevice');
    await addSimplePlanIfNotExists('sub_4_m', '4 Subdevices Monthly', 169.0, 'month', 30, 'subdevice');
    await addSimplePlanIfNotExists('sub_4_y', '4 Subdevices Annual', 1699.0, 'year', 365, 'subdevice');
    await addSimplePlanIfNotExists('sub_5_m', '5 Subdevices Monthly', 199.0, 'month', 30, 'subdevice');
    await addSimplePlanIfNotExists('sub_5_y', '5 Subdevices Annual', 1999.0, 'year', 365, 'subdevice');
  } catch (e) {
    // ignore seeding errors
  }
  console.log('✅ SQL tables initialized');
}

module.exports = { initSqlSchema };
