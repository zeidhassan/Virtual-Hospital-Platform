// src/config/db.js (or wherever your pool lives)
const { Pool } = require('pg');
const path = require('path');

// Load the right .env (default .env, or .env.test when NODE_ENV=test)
const dotenvPath = path.resolve(
  process.cwd(),
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
);
require('dotenv').config({ path: dotenvPath });

/**
 * Modes:
 *  - DB_MODE=neon  -> use DATABASE_URL / DB_URL (connection string), SSL on by default
 *  - DB_MODE=local -> use discrete credentials: DB_USER, DB_HOST, DB_DATABASE, DB_PASSWORD, DB_PORT
 *
 * Fallback: if DB_MODE is not set but DATABASE_URL/DB_URL exists, we assume "neon".
 */
const mode = (process.env.DB_MODE ||
              (process.env.DATABASE_URL || process.env.DB_URL ? 'neon' : 'local'))
  .toLowerCase();

const int = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

let poolConfig;

if (mode === 'neon') {
  // Neon / connection-string mode
  const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
  if (!connectionString) {
    throw new Error('DB_MODE=neon requires DATABASE_URL (or DB_URL) to be set.');
  }

  // SSL defaults to true for Neon; set DB_SSL=false to disable (not recommended)
  const sslOn = String(process.env.DB_SSL || 'true').toLowerCase() !== 'false';

  poolConfig = {
    connectionString,
    ssl: sslOn ? { rejectUnauthorized: false } : undefined,
    max: int(process.env.DB_POOL_MAX, 10),
    idleTimeoutMillis: int(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: int(process.env.DB_CONN_TIMEOUT_MS, 10000),
  };
} else {
  // Local / discrete env vars mode
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: int(process.env.DB_PORT, 5432),
    // Optional SSL for local (off by default)
    ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : undefined,

    max: int(process.env.DB_POOL_MAX, 10),
    idleTimeoutMillis: int(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: int(process.env.DB_CONN_TIMEOUT_MS, 10000),
  };
}

const pool = new Pool(poolConfig);

// Helpful logs (no secrets)
console.log(`[DB] Mode: ${mode} • Env file: ${dotenvPath}`);

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

module.exports = pool;
