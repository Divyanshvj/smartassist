/**
 * routes/upload.routes.js
 * ---------------------------------------------------------------------------
 * Routing for image uploads. Pure wiring: auth -> upload middleware -> controller.
 *
 * Mounted at `/upload` by routes/index.js, so the public route is:
 *   POST /api/upload/image   (JWT-protected, multipart/form-data, field "image")
 */

const express = require('express');
const authenticate = require('../middleware/authenticate');
const { uploadSingleImage } = require('../middleware/upload.middleware');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

// Uploads require a logged-in user.
router.use(authenticate);

// Accept one image on the "image" field, upload to Cloudinary, return metadata.
router.post('/image', uploadSingleImage, uploadController.uploadImage);

module.exports = router;
