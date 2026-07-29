/**
 * middleware/validate.js
 * ---------------------------------------------------------------------------
 * Runs AFTER a validator chain. It reads the accumulated validation results
 * and, if any failed, forwards a single 422 ApiError to the central error
 * handler (it never formats the response itself — that stays centralized).
 * On success it simply calls next().
 *
 * Reuse: drop it after any validator array:
 *   router.post('/signup', signupValidator, validate, controller.signup)
 */

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  // Shape errors into a compact, client-friendly list.
  const errors = result.array().map(err => ({
    field: err.path,
    message: err.msg,
  }));

  return next(new ApiError(422, 'Validation failed.', errors));
}

module.exports = validate;
