/**
 * models/user.model.js
 * ---------------------------------------------------------------------------
 * The MODEL layer: the only place that knows the `users` table exists. It
 * exposes small, intention-revealing functions over the connection pool so the
 * service layer never writes raw SQL. Every query is parameterized (`?`),
 * which lets mysql2 escape inputs and prevents SQL injection.
 */

const { pool } = require('../config/db');

/**
 * Find a single user by email.
 * @param {string} email
 * @returns {Promise<object|null>} the row (incl. password_hash) or null.
 */
async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  return rows[0] || null;
}

/**
 * Insert a new user.
 * @param {{ name: string, email: string, passwordHash: string }} data
 * @returns {Promise<{ id: number, name: string, email: string }>} the created
 *          user WITHOUT the password hash (safe to send back to the client).
 */
async function create({ name, email, passwordHash }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash],
  );
  return { id: result.insertId, name, email };
}

module.exports = { findByEmail, create };
