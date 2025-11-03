

const mysql = require('mysql2/promise');

// Read MySQL connection details from environment variables
const {
  DB_HOST = process.env.DB_HOST || 'localhost',
  DB_PORT = process.env.DB_PORT || 3306,
  DB_NAME = process.env.DB_NAME || 'voodoo_home',
  DB_USER = process.env.DB_USER || 'root',
  DB_PASSWORD = process.env.DB_PASSWORD || 'Chauhan@2'
} = process.env;

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  port:DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectDB = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`MySQL Connected: ${DB_HOST}:${DB_PORT} -> ${DB_NAME}`);
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    // Do not exit; allow API to run without DB for local testing
    return null;
  }
};

// Export the connect function as default and the pool for queries
module.exports = connectDB;
module.exports.pool = pool;