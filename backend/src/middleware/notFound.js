/**
 * middleware/notFound.js
 * ---------------------------------------------------------------------------
 * Catch-all for unmatched routes. Mounted AFTER all real routes, so any URL
 * that reached here simply doesn't exist. Responds with a consistent 404 JSON
 * body instead of Express's default HTML page.
 */

const ApiResponse = require('../utils/ApiResponse');

function notFound(req, res) {
  return ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = notFound;
