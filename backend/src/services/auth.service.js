/**
 * services/auth.service.js
 * ---------------------------------------------------------------------------
 * The SERVICE layer: pure business logic for authentication, with no knowledge
 * of HTTP (no req/res). It orchestrates the model + bcrypt and throws ApiError
 * on business failures (e.g. duplicate email). This is what keeps the flow
 * testable and the controller thin.
 *
 * NOTE: we use `bcryptjs` (a pure-JS drop-in for `bcrypt` with the identical
 * hash/compare API) because native `bcrypt` needs a C++ build toolchain that
 * isn't available on this machine. Swap the require back to 'bcrypt' if you
 * install the build tools — no other code changes needed.
 */

const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const { signAccessToken } = require('../utils/jwt');

// Cost factor for bcrypt. Higher = slower = harder to brute-force. 10 is a
// sensible production default (~100ms/hash).
const SALT_ROUNDS = 10;

/**
 * Register a new user.
 * Flow: normalize -> check duplicate -> hash password -> insert -> return.
 *
 * @param {{ name: string, email: string, password: string }} input
 * @returns {Promise<{ id: number, name: string, email: string }>}
 * @throws {ApiError} 409 if the email is already registered.
 */
async function signup({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  // 2. Reject duplicate accounts. (Step 1, validation, already ran as
  //    middleware before we got here.)
  const existing = await userModel.findByEmail(normalizedEmail);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  // 3. Hash the password — the plaintext is never stored or logged.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 4. Persist the new user.
  const user = await userModel.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  // 5. Return the safe user object. JWT issuance is intentionally deferred to
  //    a later task, so no token is generated here yet.
  return user;
}

/**
 * Authenticate a user and issue a JWT.
 * Flow: normalize -> find user -> bcrypt.compare -> sign token -> return.
 *
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ token: string, user: { id, name, email } }>}
 * @throws {ApiError} 401 if the email is unknown OR the password is wrong.
 *         Both cases share ONE message on purpose (see below).
 */
async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Look the user up by email.
  const user = await userModel.findByEmail(normalizedEmail);

  // Security: use an identical error for "no such email" and "wrong password".
  // Distinct messages would let an attacker enumerate which emails are
  // registered. We also still run bcrypt.compare below only if a user exists.
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Compare the plaintext attempt against the stored bcrypt hash. bcrypt
  // re-hashes the attempt with the salt baked into `password_hash` and checks
  // for a match in constant time.
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Credentials are valid — mint a JWT. Keep the payload minimal; `sub` is the
  // standard claim for "subject" (the user id).
  const token = signAccessToken({ sub: user.id, email: user.email });

  // Never leak the password hash back to the client.
  const safeUser = { id: user.id, name: user.name, email: user.email };

  return { token, user: safeUser };
}

module.exports = { signup, login };
