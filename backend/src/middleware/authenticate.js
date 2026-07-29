/**
 * middleware/authenticate.js
 * ---------------------------------------------------------------------------
 * Route guard for protected endpoints. It reads the Bearer token from the
 * Authorization header, verifies it, and either attaches the user to
 * `req.user` (and calls next) or rejects the request with 401.
 *
 * Usage:
 *   router.get('/conversations', authenticate, conversationController.list);
 */

const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

function authenticate(req, res, next) {
  // Read the raw Authorization header, e.g. "Bearer eyJhbGci...".
  const header = req.headers.authorization;

  // No header at all -> the client isn't authenticated. Reject with 401.
  if (!header) {
    return next(new ApiError(401, 'Authorization header missing.'));
  }

  // The header must be in the form "Bearer <token>": split on whitespace.
  const [scheme, token] = header.split(' ');

  // Enforce the exact shape: scheme must be "Bearer" and a token must follow.
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Invalid authorization format. Use: Bearer <token>.'));
  }

  try {
    // Verify the signature + expiry. Throws if the token is tampered/expired.
    const payload = verifyAccessToken(token);

    // Attach the identity to the request so downstream handlers know who is
    // calling. We map the token's `sub` claim to a friendly `id`.
    req.user = { id: payload.sub, email: payload.email };

    // Hand control to the next middleware/route handler.
    return next();
  } catch (err) {
    // jwt.verify throws (TokenExpiredError / JsonWebTokenError) on any invalid
    // token. Normalize all of these into a single 401.
    return next(new ApiError(401, 'Invalid or expired token.'));
  }
}

module.exports = authenticate;
