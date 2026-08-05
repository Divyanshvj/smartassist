/**
 * repositories/message.repository.js
 * ---------------------------------------------------------------------------
 * Data-access layer for the `messages` table. Like the conversation repo, each
 * function accepts an optional `executor` so it can run inside a transaction.
 * Ownership is enforced one level up (the service verifies the conversation
 * belongs to the user before these run).
 */

const { pool } = require('../config/db');

/**
 * Insert a message into a conversation.
 * `imageUrl` is optional (defaults to NULL) — text messages simply omit it, so
 * every existing caller keeps working unchanged.
 */
async function create({ conversationId, role, content, imageUrl = null }, executor = pool) {
  const [result] = await executor.query(
    'INSERT INTO messages (conversation_id, role, content, image_url) VALUES (?, ?, ?, ?)',
    [conversationId, role, content, imageUrl],
  );
  return { id: result.insertId, conversationId, role, content, imageUrl };
}

/** Fetch a single message by id (used to return the full row after insert). */
async function findById(id, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id, conversation_id, role, content, image_url, created_at, updated_at
     FROM messages
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/** List every message in a conversation, oldest first (chat order). */
async function findAllByConversation(conversationId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id, conversation_id, role, content, image_url, created_at, updated_at
     FROM messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC, id ASC`,
    [conversationId],
  );
  return rows;
}

module.exports = { create, findById, findAllByConversation };
