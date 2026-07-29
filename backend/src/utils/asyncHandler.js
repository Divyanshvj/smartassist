/**
 * utils/asyncHandler.js
 * ---------------------------------------------------------------------------
 * Express (v4) does not catch rejected promises from async route handlers, so
 * a thrown error inside `async (req, res) => {...}` would hang the request.
 *
 * Wrap any async handler with this to forward rejections to `next()`, which
 * routes them to the central error handler:
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
