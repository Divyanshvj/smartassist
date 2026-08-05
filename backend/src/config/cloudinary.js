/**
 * config/cloudinary.js
 * ---------------------------------------------------------------------------
 * Single place where the Cloudinary SDK is configured. Mirrors config/gemini.js:
 * read credentials from the central env config (never from process.env directly,
 * never hardcoded), configure the SDK once, and export the ready client.
 *
 * Responsibility (exactly one): hand back a configured Cloudinary v2 client.
 * It contains no upload logic — that lives in the upload middleware.
 *
 * The API secret is NEVER logged.
 */

const cloudinary = require('cloudinary').v2;
const config = require('./env');

const { cloudName, apiKey, apiSecret } = config.cloudinary;

// Fail fast, and loudly, if credentials are missing — a misconfigured upload
// service should surface at boot rather than on the first upload request.
if (!cloudName || !apiKey || !apiSecret) {
  const message =
    'Cloudinary is not configured: set CLOUDINARY_CLOUD_NAME, ' +
    'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your .env.';
  if (config.isProduction) {
    throw new Error(message);
  }
  // In development we only warn so the rest of the API can still boot.
  // eslint-disable-next-line no-console
  console.warn(`[cloudinary] Warning: ${message}`);
}

// Configure the SDK once. `secure: true` makes it return https URLs.
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

module.exports = cloudinary;
