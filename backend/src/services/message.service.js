/**
 * services/message.service.js
 * ---------------------------------------------------------------------------
 * Business logic for messages. Enforces that the target conversation belongs
 * to the requesting user before reading or writing, so users can never post to
 * or read another user's thread.
 */

const { withTransaction } = require('../config/db');
const conversationRepository = require('../repositories/conversation.repository');
const messageRepository = require('../repositories/message.repository');
const ApiError = require('../utils/ApiError');

/**
 * Add a message to a conversation. Runs in a transaction so the insert AND the
 * parent conversation's `updated_at` bump commit together — the recent-list
 * ordering can never drift out of sync with the messages.
 *
 * @param {number} userId
 * @param {{ conversationId: number, role?: string, content: string }} input
 */
async function createMessage(userId, { conversationId, role = 'user', content }) {
  return withTransaction(async conn => {
    // Ownership check inside the transaction: 404 if it isn't the user's.
    const conversation = await conversationRepository.findByIdForUser(
      conversationId,
      userId,
      conn,
    );
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found.');
    }

    const created = await messageRepository.create(
      { conversationId, role, content },
      conn,
    );
    await conversationRepository.touch(conversationId, conn);

    // Return the full row (with timestamps) rather than the partial insert.
    return messageRepository.findById(created.id, conn);
  });
}

/**
 * List all messages in a conversation the user owns (oldest first). 404 if the
 * conversation isn't theirs.
 */
async function listMessages(userId, conversationId) {
  const conversation = await conversationRepository.findByIdForUser(
    conversationId,
    userId,
  );
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found.');
  }
  return messageRepository.findAllByConversation(conversationId);
}

module.exports = { createMessage, listMessages };
