/**
 * config/env.js
 * ---------------------------------------------------------------------------
 * Single source of truth for environment configuration.
 *
 * - Loads `.env` once (via dotenv) at import time.
 * - Coerces values to the right types and applies sensible defaults.
 * - Validates that critical variables are present, failing fast on boot in
 *   production rather than at some random request later.
 *
 * Every other module imports `config` from here instead of touching
 * `process.env` directly, so the app has one predictable shape to rely on.
 */

require('dotenv').config();

// Read a variable with an optional fallback.
const get = (key, fallback) => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

// Read and parse an integer variable, falling back if unset/invalid.
const getInt = (key, fallback) => {
  const parsed = parseInt(process.env[key], 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const nodeEnv = get('NODE_ENV', 'development');

const config = {
  env: nodeEnv,
  isProduction: nodeEnv === 'production',
  port: getInt('PORT', 4000),

  // Parse the comma-separated CORS list into an array (or '*').
  corsOrigin: (() => {
    const raw = get('CORS_ORIGIN', '*');
    if (raw === '*') return '*';
    return raw
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
  })(),

  db: {
    host: get('DB_HOST', 'localhost'),
    port: getInt('DB_PORT', 3306),
    user: get('DB_USER', 'root'),
    password: get('DB_PASSWORD', ''),
    database: get('DB_NAME', 'smartassist'),
    connectionLimit: getInt('DB_CONNECTION_LIMIT', 10),
  },

  jwt: {
    secret: get('JWT_SECRET', ''),
    expiresIn: get('JWT_EXPIRES_IN', '1d'),
  },

  // Google Gemini (Feature 3). The API key is read here and NEVER logged.
  gemini: {
    apiKey: get('GOOGLE_GEMINI_API_KEY', ''),
    model: get('GEMINI_MODEL', 'gemini-flash-latest'),
    timeoutMs: getInt('GEMINI_TIMEOUT_MS', 30000),
  },

  // Cloudinary (image uploads). Credentials come ONLY from the environment and
  // are never logged. Used by config/cloudinary.js to configure the SDK.
  cloudinary: {
    cloudName: get('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: get('CLOUDINARY_API_KEY', ''),
    apiSecret: get('CLOUDINARY_API_SECRET', ''),
  },
};

/**
 * Fail fast if required configuration is missing in production. We only warn in
 * development so the server can still boot (e.g. to hit /api/health) while the
 * database or secrets are still being set up.
 */
const requiredInProduction = [
  ['DB_NAME', config.db.database],
  ['DB_USER', config.db.user],
  ['JWT_SECRET', config.jwt.secret],
  ['GOOGLE_GEMINI_API_KEY', config.gemini.apiKey],
  ['CLOUDINARY_CLOUD_NAME', config.cloudinary.cloudName],
  ['CLOUDINARY_API_KEY', config.cloudinary.apiKey],
  ['CLOUDINARY_API_SECRET', config.cloudinary.apiSecret],
];

const missing = requiredInProduction
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  const message = `Missing required environment variables: ${missing.join(', ')}`;
  if (config.isProduction) {
    throw new Error(message);
  }
  // eslint-disable-next-line no-console
  console.warn(`[env] Warning: ${message} (allowed in ${config.env})`);
}

module.exports = config;
