const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lostwise',
  dateStrings: true,
});

// Run a query and return only its rows
const query = async (sql, params) => (await pool.query(sql, params))[0];

module.exports = { pool, query };
