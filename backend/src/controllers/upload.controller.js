/**
 * controllers/upload.controller.js
 * ---------------------------------------------------------------------------
 * HTTP layer for the standalone image upload endpoint (POST /api/upload/image).
 * The upload middleware has already streamed the file to Cloudinary and set
 * req.file; this controller delegates metadata extraction to the upload service
 * (single source of truth) and shapes this endpoint's flat response.
 *
 * NOTE: the chat endpoint (POST /api/chat/upload-image) uses the SAME service
 * but a wrapped { success, data } shape — the shared service avoids duplicating
 * the Cloudinary logic across both.
 */

const asyncHandler = require('../utils/asyncHandler');
const uploadService = require('../services/upload.service');

/**
 * POST /api/upload/image  (JWT-protected, field name: "image")
 * Success (201): { imageUrl, publicId, width, height, format, bytes }
 * @type {import('express').RequestHandler}
 */
const uploadImage = asyncHandler(async (req, res) => {
  const { imageUrl, publicId, width, height, format, size } =
    await uploadService.getImageMetadata(req.file);

  // This endpoint's contract names the byte count `bytes`.
  return res.status(201).json({ imageUrl, publicId, width, height, format, bytes: size });
});

module.exports = { uploadImage };
