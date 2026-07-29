/**
 * repositories/conversation.repository.js
 * ---------------------------------------------------------------------------
 * Data-access layer for the `conversations` table — the only place that writes
 * conversation SQL. Every query is parameterized (SQL-injection safe) and
 * scoped by `user_id` so a user can only ever touch their own rows.
 *
 * Each function takes an optional `executor` (a pool or a transaction
 * connection), defaulting to the shared pool. Passing a transaction connection
 * lets the service run several repo calls atomically.
 */

const { pool } = require('../config/db');

/** Insert a conversation. */
async function create({ userId, title }, executor = pool) {
  const [result] = await executor.query(
    'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
    [userId, title ?? null],
  );
  return { id: result.insertId, userId, title: title ?? null };
}

/**
 * List a user's conversations, newest activity first. Includes a preview of the
 * latest message (and its time) via correlated subqueries so the frontend list
 * can render title + preview + time in one call.
 */
async function findAllByUser(userId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT
       c.id,
       c.title,
       c.created_at,
       c.updated_at,
       (SELECT m.content    FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message,
       (SELECT m.created_at FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message_at
     FROM conversations c
     WHERE c.user_id = ?
     ORDER BY c.updated_at DESC, c.id DESC`,
    [userId],
  );
  return rows;
}

/** Fetch one conversation, but only if it belongs to the user. */
async function findByIdForUser(id, userId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id, user_id, title, created_at, updated_at
     FROM conversations
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [id, userId],
  );
  return rows[0] || null;
}

/**
 * Delete a conversation owned by the user. Returns the number of rows removed
 * (0 means it didn't exist or wasn't theirs). Messages are removed by the
 * ON DELETE CASCADE foreign key.
 */
async function deleteByIdForUser(id, userId, executor = pool) {
  const [result] = await executor.query(
    'DELETE FROM conversations WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return result.affectedRows;
}

/** Bump `updated_at` so the thread sorts to the top after new activity. */
async function touch(id, executor = pool) {
  await executor.query(
    'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id],
  );
}

module.exports = {
  create,
  findAllByUser,
  findByIdForUser,
  deleteByIdForUser,
  touch,
};
