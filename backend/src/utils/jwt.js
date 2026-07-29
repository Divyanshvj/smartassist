/**
 * utils/jwt.js
 * ---------------------------------------------------------------------------
 * Thin wrapper around `jsonwebtoken` so token creation/verification lives in
 * one place and always uses the configured secret + expiry from `.env`. Other
 * layers call these helpers instead of importing `jsonwebtoken` directly.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Sign a short-lived access token.
 * @param {object} payload  claims to embed (keep it small: id + email).
 * @returns {string} a signed JWT string.
 */
function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Verify and decode a token. Throws if invalid/expired (used later by auth
 * middleware to protect routes).
 * @param {string} token
 * @returns {object} the decoded payload.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { signAccessToken, verifyAccessToken };
