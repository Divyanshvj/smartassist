/**
 * routes/auth.routes.js
 * ---------------------------------------------------------------------------
 * The ROUTE layer for authentication. It wires a URL + HTTP method to the
 * middleware pipeline in order:
 *
 *   signupValidator  -> validate  -> controller.signup
 *   (define rules)      (enforce)     (handle request)
 *
 * Mounted under '/auth' in routes/index.js, so this becomes POST /api/auth/signup.
 */

const express = require('express');
const {
  signupValidator,
  loginValidator,
} = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', signupValidator, validate, authController.signup);
router.post('/login', loginValidator, validate, authController.login);

module.exports = router;
