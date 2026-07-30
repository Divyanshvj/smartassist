/**
 * services/ai.service.js
 * ---------------------------------------------------------------------------
 * Thin service around the Gemini client. Its single responsibility is to turn
 * a plain text prompt into a plain text reply.
 *
 * It knows NOTHING about Express, HTTP, databases, request/response objects, or
 * conversation storage. Callers pass a string and get a string back (via a
 * Promise). This keeps the AI concern isolated and trivially testable.
 *
 * The Gemini client itself is created once in config/gemini.js; this module
 * just uses it.
 */

const geminiClient = require('../config/gemini');
const config = require('../config/env');

/**
 * Generate a text response from a single prompt.
 *
 * @param {string} prompt - The user prompt to send to the model.
 * @returns {Promise<string>} The generated text, trimmed.
 * @throws {Error} A normalized error with a safe, human-readable message
 *                 (the raw SDK/network error is never leaked to the caller).
 */
async function generateResponse(prompt) {
  // Guard the contract: we only accept a non-empty string.
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('A non-empty prompt string is required.');
  }

  try {
    // Ask Gemini for a completion. `contents` accepts a plain string for the
    // simple single-turn case, which is exactly this method's scope.
    const response = await geminiClient.models.generateContent({
      model: config.gemini.model,
      contents: prompt,
    });

    // The SDK exposes the concatenated text via the `.text` accessor.
    const text = (response.text || '').trim();

    // An empty completion is a failure from the caller's point of view.
    if (!text) {
      throw new Error('The AI service returned an empty response.');
    }

    return text;
  } catch (error) {
    // Translate any failure into a single, safe Error. We never surface the
    // API key or raw SDK internals.
    throw normalizeGeminiError(error);
  }
}

/**
 * Stream a text response from a single prompt, yielding chunks as they arrive.
 *
 * This is the streaming counterpart to generateResponse. It uses the Gemini
 * SDK's streaming API and is an async generator, so the controller can simply
 * `for await (const chunk of streamResponse(...))` and forward each piece to
 * the client. All Gemini/SDK knowledge stays here — the controller never
 * touches the SDK (clean architecture: controller -> service -> Gemini client).
 *
 * @param {string} prompt - The user prompt to send to the model.
 * @param {{ signal?: AbortSignal }} [options] - Optional abort signal; when it
 *        fires (client disconnect / Stop), the underlying stream is cancelled.
 * @yields {string} Successive text fragments of the reply.
 * @throws {Error} A normalized, user-safe error (never leaks the API key).
 */
async function* streamResponse(prompt, { signal } = {}) {
  // Same contract guard as the non-streaming path.
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('A non-empty prompt string is required.');
  }

  try {
    // Ask Gemini for a streamed completion. The SDK returns an async iterable
    // of chunks; passing the abortSignal lets us cancel mid-stream.
    const stream = await geminiClient.models.generateContentStream({
      model: config.gemini.model,
      contents: prompt,
      ...(signal ? { config: { abortSignal: signal } } : {}),
    });

    for await (const chunk of stream) {
      // If the caller aborted (client left / pressed Stop), stop quietly.
      if (signal && signal.aborted) {
        return;
      }
      // Each chunk exposes concatenated text via the `.text` accessor.
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    // An abort surfaces as a thrown error mid-iteration; treat it as a normal
    // stop, not a failure.
    if (signal && signal.aborted) {
      return;
    }
    throw normalizeGeminiError(error);
  }
}

/**
 * Map any Gemini SDK / network / internal failure onto a clean Error with a
 * predictable, user-safe message.
 *
 * @param {unknown} error - Whatever was thrown (SDK error, network error, or
 *                          one of our own Errors above).
 * @returns {Error} A normalized Error.
 */
function normalizeGeminiError(error) {
  // Our own guard/empty-response errors already carry safe messages: pass through.
  if (error instanceof Error && !isSdkOrNetworkError(error)) {
    return error;
  }

  // HTTP status can live in a couple of places depending on SDK version.
  const status = error?.status ?? error?.response?.status;
  const code = error?.code;

  // Network-level failures never reach an HTTP status.
  if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)) {
    return new Error('Could not reach the AI service. Please try again.');
  }

  switch (status) {
    case 429:
      return new Error('AI rate limit reached. Please try again shortly.');
    case 401:
    case 403:
      return new Error('AI authentication failed (invalid API key).');
    case 400:
      return new Error('The prompt was rejected by the AI service.');
    case 404:
      // Almost always a bad/retired model name in GEMINI_MODEL.
      return new Error('The configured AI model is unavailable. Check GEMINI_MODEL.');
    default:
      return new Error('The AI service failed to generate a response.');
  }
}

/**
 * Heuristic: does this look like an error that originated from the SDK or the
 * network (i.e. it carries a status/code), as opposed to one we threw
 * deliberately with an already-safe message?
 *
 * @param {any} error
 * @returns {boolean}
 */
function isSdkOrNetworkError(error) {
  return Boolean(error?.status || error?.response?.status || error?.code);
}

module.exports = { generateResponse, streamResponse };
