/**
 * services/conversation.service.js
 * ---------------------------------------------------------------------------
 * Business logic for conversations. No HTTP here (no req/res) — it takes the
 * authenticated user's id plus plain inputs, enforces ownership rules, and
 * throws ApiError on failures. Uses a transaction when a create must also write
 * a first message atomically.
 */

const { withTransaction } = require('../config/db');
const conversationRepository = require('../repositories/conversation.repository');
const messageRepository = require('../repositories/message.repository');
const ApiError = require('../utils/ApiError');

/**
 * Create a conversation. If an initial `message` is provided, the conversation
 * and its first message are inserted in ONE transaction — either both land or
 * neither does (no orphan empty conversation if the message insert fails).
 */
async function createConversation(userId, { title, message }) {
  if (message) {
    return withTransaction(async conn => {
      const created = await conversationRepository.create(
        { userId, title: title ?? null },
        conn,
      );
      await messageRepository.create(
        { conversationId: created.id, role: 'user', content: message },
        conn,
      );
      return conversationRepository.findByIdForUser(created.id, userId, conn);
    });
  }

  const created = await conversationRepository.create({ userId, title: title ?? null });
  return conversationRepository.findByIdForUser(created.id, userId);
}

/** List all conversations belonging to the user. */
async function listConversations(userId) {
  return conversationRepository.findAllByUser(userId);
}

/** Get one conversation, enforcing ownership (404 if not the user's). */
async function getConversation(userId, id) {
  const conversation = await conversationRepository.findByIdForUser(id, userId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found.');
  }
  return conversation;
}

/**
 * Delete one conversation the user owns. 404 if it doesn't exist or isn't
 * theirs. Its messages are removed by the ON DELETE CASCADE foreign key.
 */
async function deleteConversation(userId, id) {
  const affected = await conversationRepository.deleteByIdForUser(id, userId);
  if (affected === 0) {
    throw new ApiError(404, 'Conversation not found.');
  }
}

module.exports = {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
};
