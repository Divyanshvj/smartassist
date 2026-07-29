/**
 * config/db.js
 * ---------------------------------------------------------------------------
 * MySQL connectivity using a connection *pool* (mysql2/promise).
 *
 * A pool is the production-correct choice: it reuses a bounded set of
 * connections across requests instead of opening/closing one per query, which
 * would exhaust the database under load.
 *
 * Exports:
 *   - pool                : the shared pool; use `pool.query(...)` everywhere.
 *   - verifyConnection()  : pings the DB once (called on startup to surface
 *                           misconfiguration early). Non-throwing by design so
 *                           the caller decides how to react.
 */

const mysql = require('mysql2/promise');
const config = require('./env');

// Create the pool once and reuse it for the lifetime of the process.
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  // Fail a connection attempt quickly instead of hanging if the DB is down.
  connectTimeout: 5000,
});

/**
 * Grab a connection, ping it, and release it back to the pool.
 * @returns {Promise<boolean>} true if the database answered, false otherwise.
 */
async function verifyConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[db] Connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Run `work` inside a single transaction. The callback receives a dedicated
 * connection to use for every query in the unit of work. On success the
 * transaction commits; if the callback throws, it rolls back — so the write is
 * all-or-nothing. The connection is always released back to the pool.
 *
 *   const msg = await withTransaction(async (conn) => {
 *     await repoA.insert(x, conn);
 *     await repoB.update(y, conn);
 *     return result;
 *   });
 *
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} work
 * @returns {Promise<T>}
 */
async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { pool, verifyConnection, withTransaction };
