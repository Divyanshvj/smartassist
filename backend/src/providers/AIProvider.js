/**
 * providers/AIProvider.js
 * ---------------------------------------------------------------------------
 * The abstraction (interface) every AI provider must implement. Services depend
 * on THIS, never on a concrete SDK — that's the Dependency Inversion Principle:
 * swapping Gemini for another model later means adding a new provider, with no
 * change to chatService.
 *
 * A "chat message" is provider-neutral:
 *   @typedef {{ role: 'user'|'assistant'|'system', content: string }} ChatMessage
 *
 * Concrete providers (e.g. GeminiProvider) extend this class and implement
 * generateReply(). Calling the base method throws, so a half-implemented
 * provider fails loudly instead of silently.
 */

class AIProvider {
  /**
   * Generate an assistant reply for a conversation.
   * @param {ChatMessage[]} messages - full history, oldest first.
   * @returns {Promise<string>} the assistant's reply as clean text.
   */
  // eslint-disable-next-line no-unused-vars
  async generateReply(messages) {
    throw new Error('AIProvider.generateReply() must be implemented by a subclass.');
  }
}

module.exports = AIProvider;
