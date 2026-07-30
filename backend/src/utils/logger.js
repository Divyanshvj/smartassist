/**
 * utils/logger.js
 * ---------------------------------------------------------------------------
 * A tiny, centralized logger so app code doesn't scatter console.* calls (and
 * so we can later swap in pino/winston in one place). Levels are prefixed for
 * easy grepping. NEVER pass secrets (API keys, tokens) to these functions.
 */

/* eslint-disable no-console */
const logger = {
  info: (message) => console.log(`[info] ${message}`),
  warn: (message) => console.warn(`[warn] ${message}`),
  error: (message) => console.error(`[error] ${message}`),
};

module.exports = logger;
