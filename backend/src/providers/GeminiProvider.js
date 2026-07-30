/**
 * providers/GeminiProvider.js
 * ---------------------------------------------------------------------------
 * Concrete AIProvider backed by Google Gemini via the official @google/genai
 * SDK. It is the ONLY file that imports the SDK, so all Gemini-specific
 * knowledge (message format, error shapes, token metadata) is isolated here.
 *
 * Responsibilities:
 *   - map neutral ChatMessage[] -> Gemini `contents` (+ systemInstruction),
 *   - call the model with a hard timeout,
 *   - return clean reply text,
 *   - translate SDK/network failures into standardized ApiErrors,
 *   - log timing + token usage + model (never the API key).
 */

const { GoogleGenAI } = require('@google/genai');
const AIProvider = require('./AIProvider');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class GeminiProvider extends AIProvider {
  /**
   * @param {{ apiKey: string, model: string, timeoutMs?: number }} opts
   */
  constructor({ apiKey, model, timeoutMs = 30000 }) {
    super();
    this._apiKey = apiKey;
    this._model = model;
    this._timeoutMs = timeoutMs;
    // Only build the client when a key exists; missing key is handled per-call.
    this._client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  /**
   * Convert neutral history into Gemini's format. Gemini uses roles 'user' and
   * 'model'; 'system' messages are collected into a single systemInstruction.
   * @param {Array<{role: string, content: string}>} messages
   */
  _toGeminiContents(messages) {
    const systemParts = [];
    const contents = [];
    for (const m of messages) {
      if (m.role === 'system') {
        systemParts.push(m.content);
        continue;
      }
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
    return {
      contents,
      systemInstruction: systemParts.length ? systemParts.join('\n') : undefined,
    };
  }

  /** Reject with a 504 ApiError if the underlying promise is too slow. */
  _withTimeout(promise) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new ApiError(504, 'AI request timed out.')),
        this._timeoutMs,
      );
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  /**
   * Generate a reply. See AIProvider for the contract.
   * @param {Array<{role: string, content: string}>} messages
   * @returns {Promise<string>}
   */
  async generateReply(messages) {
    // Missing API key -> config error (standardized, no secret leaked).
    if (!this._client) {
      throw new ApiError(500, 'AI service is not configured (missing API key).');
    }

    const { contents, systemInstruction } = this._toGeminiContents(messages);
    const startedAt = Date.now();

    try {
      const response = await this._withTimeout(
        this._client.models.generateContent({
          model: this._model,
          contents,
          ...(systemInstruction ? { config: { systemInstruction } } : {}),
        }),
      );

      const text = (response.text || '').trim();
      const usage = response.usageMetadata;
      logger.info(
        `[ai] model=${this._model} time=${Date.now() - startedAt}ms ` +
          (usage
            ? `tokens(prompt=${usage.promptTokenCount},candidates=${usage.candidatesTokenCount},total=${usage.totalTokenCount})`
            : 'tokens=n/a'),
      );

      // Empty response -> standardized error.
      if (!text) {
        throw new ApiError(502, 'AI returned an empty response.');
      }
      return text;
    } catch (error) {
      throw this._mapError(error, Date.now() - startedAt);
    }
  }

  /**
   * Translate any failure into a standardized ApiError with a safe message.
   * Never includes the API key.
   * @param {*} error
   * @param {number} elapsedMs
   * @returns {ApiError}
   */
  _mapError(error, elapsedMs) {
    // Our own ApiErrors (timeout, empty) pass straight through, but still log.
    if (error instanceof ApiError) {
      logger.error(`[ai] model=${this._model} time=${elapsedMs}ms ${error.message}`);
      return error;
    }

    const status = error?.status ?? error?.response?.status;
    const code = error?.code;
    const raw = error?.message || 'Unknown AI error';
    logger.error(`[ai] model=${this._model} time=${elapsedMs}ms failure: ${raw}`);

    // Network-level failures (no HTTP status).
    if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)) {
      return new ApiError(503, 'Could not reach the AI service. Please try again.');
    }
    if (status === 429) {
      return new ApiError(429, 'AI rate limit reached. Please try again shortly.');
    }
    if (status === 401 || status === 403) {
      return new ApiError(502, 'AI authentication failed (invalid API key).');
    }
    if (status === 400) {
      return new ApiError(400, 'The message was rejected by the AI service.');
    }
    // Fallback: upstream/unknown.
    return new ApiError(502, 'The AI service failed to generate a reply.');
  }
}

module.exports = GeminiProvider;
