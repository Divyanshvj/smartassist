/**
 * services/chat.service.js
 * ---------------------------------------------------------------------------
 * Orchestrates an AI chat turn. Built via a factory that RECEIVES its AIProvider
 * (Dependency Injection) — it never imports a concrete provider, so it stays
 * testable and provider-agnostic. Reuses the existing conversation/message
 * repositories (no duplicate SQL) and the withTransaction helper.
 *
 * Note: the AI call sits BETWEEN the two DB writes and is NOT wrapped in a
 * transaction — holding a DB transaction open across a slow network call is an
 * anti-pattern. Each save is its own small transaction (insert + touch).
 */

const { withTransaction } = require('../config/db');
const conversationRepository = require('../repositories/conversation.repository');
const messageRepository = require('../repositories/message.repository');
const ApiError = require('../utils/ApiError');

/**
 * @param {{ aiProvider: import('../providers/AIProvider') }} deps
 */
function createChatService({ aiProvider }) {
  /**
   * Insert one message and bump the conversation's updated_at, atomically.
   * Returns the full saved row (with timestamps).
   */
  async function saveMessage(conversationId, role, content) {
    return withTransaction(async (conn) => {
      const created = await messageRepository.create(
        { conversationId, role, content },
        conn,
      );
      await conversationRepository.touch(conversationId, conn);
      return messageRepository.findById(created.id, conn);
    });
  }

  /**
   * Run a full chat turn (the 9-step flow).
   * @param {number} userId - from the JWT.
   * @param {{ conversationId: number, message: string }} input
   * @returns {Promise<{ conversationId: number, userMessage: object, assistantMessage: object }>}
   */
  async function sendMessage(userId, { conversationId, message }) {
    // 2. Ownership: the conversation must belong to the caller (404 otherwise).
    const conversation = await conversationRepository.findByIdForUser(
      conversationId,
      userId,
    );
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found.');
    }

    // 3. Persist the user's message (updated_at bumps automatically).
    const userMessage = await saveMessage(conversationId, 'user', message);

    // 4. Fetch the full history (includes the message we just saved).
    const history = await messageRepository.findAllByConversation(conversationId);

    // 5. Convert DB rows into the provider-neutral shape the AIProvider expects.
    const chatHistory = history.map((m) => ({ role: m.role, content: m.content }));

    // 6 + 7. Ask the AI provider for a reply (errors are standardized inside it).
    const replyText = await aiProvider.generateReply(chatHistory);

    // 8. Persist the assistant's reply.
    const assistantMessage = await saveMessage(conversationId, 'assistant', replyText);

    // 9. Hand both messages back to the controller.
    return { conversationId, userMessage, assistantMessage };
  }

  return { sendMessage };
}

module.exports = { createChatService };
