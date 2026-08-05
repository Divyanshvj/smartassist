/**
 * services/upload.service.js
 * ---------------------------------------------------------------------------
 * Business logic for image uploads. No HTTP here (no req/res): it takes the
 * multer file object (already streamed to Cloudinary by the upload middleware)
 * and returns a clean, canonical metadata object.
 *
 * Why a service does this: multer-storage-cloudinary only exposes url/publicId/
 * bytes on the file, so the dimensions + format are fetched from Cloudinary
 * here — keeping controllers thin and this logic reusable by any upload route.
 */

const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

/**
 * Turn an uploaded multer file into canonical image metadata.
 *
 * @param {Express.Multer.File | undefined} file - req.file set by the upload
 *        middleware (path=secure_url, filename=public_id, size=bytes).
 * @returns {Promise<{ imageUrl: string, publicId: string, width: number|null,
 *          height: number|null, format: string|null, size: number }>}
 * @throws {ApiError} 400 when no file was provided.
 */
async function getImageMetadata(file) {
  if (!file) {
    throw new ApiError(400, 'No image uploaded. Send a file in the "image" field.');
  }

  const publicId = file.filename; // Cloudinary public_id
  let imageUrl = file.path; // secure_url
  let size = file.size; // bytes
  let width = null;
  let height = null;
  let format = null;

  try {
    // Fetch dimensions/format the storage engine doesn't surface on `file`.
    const resource = await cloudinary.api.resource(publicId, { resource_type: 'image' });
    imageUrl = resource.secure_url || imageUrl;
    size = resource.bytes ?? size;
    width = resource.width ?? null;
    height = resource.height ?? null;
    format = resource.format ?? null;
  } catch (err) {
    // Best-effort fallback so a metadata hiccup doesn't fail the upload.
    format = (file.mimetype || '').split('/')[1] || null;
  }

  return { imageUrl, publicId, width, height, format, size };
}

module.exports = { getImageMetadata };
