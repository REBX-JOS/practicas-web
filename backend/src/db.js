const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'practicas_user',
  password: process.env.DB_PASSWORD || 'practicas_pass',
  database: process.env.DB_NAME || 'practicas_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function pingDb() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  pingDb,
};
