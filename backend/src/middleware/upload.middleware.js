/**
 * middleware/upload.middleware.js
 * ---------------------------------------------------------------------------
 * Multer upload pipeline that streams images DIRECTLY to Cloudinary — nothing
 * is ever written to local disk (no diskStorage, no /uploads folder).
 *
 * Rules enforced here:
 *   - Accept only jpg / jpeg / png / webp (checked by mimetype + Cloudinary).
 *   - Max size 10 MB (multer `limits.fileSize`).
 *   - Store under the "SmartAssist/images" Cloudinary folder.
 *
 * Errors are normalized into ApiError so the central error handler returns the
 * right HTTP status (413 for too-large, 400 for wrong type).
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

// The only image types we accept.
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// 10 MB, expressed in bytes.
const MAX_BYTES = 10 * 1024 * 1024;

// Cloudinary storage engine: multer hands each file's stream straight to
// Cloudinary's upload_stream (see multer-storage-cloudinary), so the bytes
// never touch the local filesystem.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'SmartAssist/images', // requirement 7 — organize uploads here
    resource_type: 'image',
    allowed_formats: ALLOWED_FORMATS, // server-side format guard at Cloudinary
  },
});

// Reject non-image types early (before the upload) based on the mimetype.
function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new ApiError(400, 'Only JPG, JPEG, PNG and WEBP images are allowed.'));
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1 },
});

/**
 * Express middleware: accept a single image on the `image` field and normalize
 * multer's errors into ApiError.
 *
 * Usage:  router.post('/image', authenticate, uploadSingleImage, controller)
 */
function uploadSingleImage(req, res, next) {
  multerUpload.single('image')(req, res, err => {
    if (!err) {
      return next();
    }
    // multer's own errors (e.g. file too large) -> friendly HTTP statuses.
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(413, 'Image exceeds the 10 MB size limit.'));
      }
      return next(new ApiError(400, err.message));
    }
    // ApiError from fileFilter, or a Cloudinary/network error — pass through.
    return next(err);
  });
}

module.exports = { uploadSingleImage };
