// MySQL/MariaDB connection. The app runs in a container, so "localhost" may not
// be the cPanel server's database. DB_HOST can list several hosts separated by
// commas; we use the first one that accepts a connection, and keep retrying in
// the background if none do (the guide page still works without a database).

const mysql = require('mysql2/promise');

const DEFAULT_HOSTS = 'host.containers.internal,localhost,127.0.0.1,10.0.2.2';
const RETRY_MS = 30000;

const state = { pool: null, host: null, lastError: null };

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     email VARCHAR(255) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NOT NULL,
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     last_login_at DATETIME NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash CHAR(64) PRIMARY KEY,
     user_id INT UNSIGNED NOT NULL,
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     expires_at DATETIME NOT NULL,
     INDEX (user_id),
     INDEX (expires_at),
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

function config(host) {
  return {
    host,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 4000,
    waitForConnections: true,
    connectionLimit: 5
  };
}

async function connect() {
  if (!process.env.DB_USER || !process.env.DB_NAME) {
    state.lastError = 'DB_USER / DB_NAME not set';
    console.log('Database: ' + state.lastError);
    return;
  }
  const hosts = (process.env.DB_HOST || DEFAULT_HOSTS).split(',').map(h => h.trim()).filter(Boolean);
  for (const host of hosts) {
    const pool = mysql.createPool(config(host));
    try {
      await pool.query('SELECT 1');
      for (const sql of SCHEMA) await pool.query(sql);
      state.pool = pool;
      state.host = host;
      state.lastError = null;
      console.log(`Database: connected via ${host}`);
      return;
    } catch (err) {
      state.lastError = `${host}: ${err.code || err.message}`;
      console.log(`Database: ${host} failed (${err.code || err.message})`);
      await pool.end().catch(() => {});
    }
  }
  setTimeout(connect, RETRY_MS).unref();
}

async function query(sql, params) {
  if (!state.pool) throw new Error('DB_UNAVAILABLE');
  const [rows] = await state.pool.query(sql, params);
  return rows;
}

function status() {
  return { connected: !!state.pool, host: state.host };
}

module.exports = { connect, query, status };
