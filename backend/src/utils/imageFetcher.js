/**
 * utils/imageFetcher.js
 * ---------------------------------------------------------------------------
 * Fetches a remote image and returns it as base64 + mime type, ready to hand
 * to Gemini as inline image data.
 *
 * The Gemini Developer API can't consume an arbitrary image URL directly (its
 * fileData only accepts Gemini Files-API URIs), so for the "Cloudinary URL ->
 * Gemini Vision" flow we download the bytes here and inline them.
 *
 * Safety: only https Cloudinary delivery URLs are allowed (prevents the client
 * from pointing this at internal/other hosts — SSRF), with size + time limits.
 */

const axios = require('axios');
const ApiError = require('./ApiError');

// Cloudinary's delivery host. We only fetch images from here.
const CLOUDINARY_HOST = 'res.cloudinary.com';
const MAX_BYTES = 10 * 1024 * 1024; // match the upload limit
const TIMEOUT_MS = 15000;

/**
 * Download an image URL and return { data (base64), mimeType }.
 *
 * @param {string} url - an https Cloudinary image URL.
 * @returns {Promise<{ data: string, mimeType: string }>}
 * @throws {ApiError} 400 for a bad/non-Cloudinary URL or non-image content,
 *         502 if the fetch itself fails.
 */
async function fetchImageAsBase64(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    throw new ApiError(400, 'Invalid image URL.');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== CLOUDINARY_HOST) {
    throw new ApiError(400, 'Image URL must be an https Cloudinary URL.');
  }

  let response;
  try {
    response = await axios.get(url, {
      responseType: 'arraybuffer',
      maxContentLength: MAX_BYTES,
      timeout: TIMEOUT_MS,
    });
  } catch (err) {
    throw new ApiError(502, 'Could not fetch the image for analysis.');
  }

  const mimeType = response.headers['content-type'] || 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    throw new ApiError(400, 'The provided URL does not point to an image.');
  }

  const data = Buffer.from(response.data).toString('base64');
  return { data, mimeType };
}

module.exports = { fetchImageAsBase64 };
