/**
 * config/gemini.js
 * ---------------------------------------------------------------------------
 * Single, authoritative place where the Google Gemini SDK client is created.
 *
 * Responsibility (exactly one): construct and export a ready-to-use
 * `GoogleGenAI` client instance. Nothing in here knows about chat history,
 * prompts, routes, or HTTP — that lives in the providers/services layer. This
 * module only answers the question "give me an authenticated Gemini client".
 *
 * Design notes:
 *   - We read the API key at import time and FAIL FAST with a descriptive error
 *     if it is missing. A misconfigured server should refuse to start rather
 *     than surface a confusing 500 on the first chat request.
 *   - The key is read via the central `config` module (config/env.js), which is
 *     the project's single source of truth for environment variables and is
 *     responsible for loading `.env` through dotenv. We do not touch
 *     `process.env` for the key directly, keeping one predictable shape.
 *   - The API key is NEVER logged or included in any thrown error message.
 */

const { GoogleGenAI } = require('@google/genai');
const config = require('./env');

/**
 * The Gemini API key, sourced from the central env config.
 *
 * In `config/env.js` this maps to the `GOOGLE_GEMINI_API_KEY` environment
 * variable. If you set it as `GEMINI_API_KEY` in your `.env`, either rename it
 * there or add the alias in `config/env.js` so this stays the single source of
 * truth.
 *
 * @type {string}
 */
const apiKey = config.gemini.apiKey;

// Fail fast, and loudly, on a missing key. This runs once at import time, so a
// misconfigured deployment breaks at boot instead of on the first user message.
if (!apiKey) {
  throw new Error(
    'Gemini is not configured: the API key is missing. ' +
      'Set GOOGLE_GEMINI_API_KEY in your .env file (see config/env.js). ' +
      'The server will not start without it.',
  );
}

/**
 * The initialized, authenticated Gemini client.
 *
 * Import this wherever a Gemini client is needed instead of calling
 * `new GoogleGenAI(...)` again — one client is reused across the process, so
 * the SDK's connection handling and defaults are shared.
 *
 * @type {import('@google/genai').GoogleGenAI}
 */
const geminiClient = new GoogleGenAI({ apiKey });

module.exports = geminiClient;
