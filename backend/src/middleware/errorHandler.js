/**
 * middleware/errorHandler.js
 * ---------------------------------------------------------------------------
 * Central Express error handler — the LAST middleware mounted. Any error
 * passed to `next(err)` (including rejections caught by asyncHandler) lands
 * here, so individual handlers never format error responses themselves.
 *
 * An Express error handler MUST declare all four arguments (err, req, res,
 * next) — that 4-arg signature is how Express identifies it.
 */

const ApiResponse = require('../utils/ApiResponse');
const config = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Use an explicit status if the error carries one, else 500.
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log server-side for observability. Include the stack outside production.
  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  if (!config.isProduction && err.stack) {
    // eslint-disable-next-line no-console
    console.error(err.stack);
  }

  // Never leak internal details of a 500 to clients in production.
  const clientMessage =
    status === 500 && config.isProduction ? 'Internal server error' : message;

  return ApiResponse.error(res, clientMessage, status, err.errors);
}

module.exports = errorHandler;
