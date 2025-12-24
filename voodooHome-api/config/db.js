
const mysql = require('mysql2/promise');

// STRICT: Only read from environment
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || 3306;
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error('Missing required database environment variables');
}

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectDB = async () => {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  console.log(`MySQL Connected: ${DB_HOST}:${DB_PORT} -> ${DB_NAME}`);
};

module.exports = connectDB;
module.exports.pool = pool;
