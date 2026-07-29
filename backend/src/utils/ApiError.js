/**
 * utils/ApiError.js
 * ---------------------------------------------------------------------------
 * A typed error that carries an HTTP status (and optional field errors) so any
 * layer can `throw new ApiError(409, '...')` and the central error handler
 * turns it into the right HTTP response. This is what makes error handling
 * "centralized": services never touch `res`, they just throw.
 */

class ApiError extends Error {
  /**
   * @param {number} status   HTTP status code (e.g. 409, 422)
   * @param {string} message  human-readable message
   * @param {Array}  [errors] optional list of field-level validation errors
   */
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (errors) this.errors = errors;
    // Keep a clean stack trace pointing at the throw site, not this constructor.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
