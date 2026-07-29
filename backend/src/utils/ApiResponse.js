/**
 * utils/ApiResponse.js
 * ---------------------------------------------------------------------------
 * Tiny helpers that keep every JSON response in one consistent shape:
 *
 *   { "success": true,  "message": "...", "data": {...} }   // success
 *   { "success": false, "message": "...", "errors": [...] } // failure
 *
 * `data`/`errors` are only included when provided, so trivial responses stay
 * clean (e.g. the health check is exactly { success, message }).
 */

const ApiResponse = {
  /**
   * Send a success response.
   * @param {import('express').Response} res
   * @param {string} message
   * @param {*} [data]           optional payload
   * @param {number} [status=200]
   */
  success(res, message, data, status = 200) {
    const body = { success: true, message };
    if (data !== undefined) body.data = data;
    return res.status(status).json(body);
  },

  /**
   * Send an error response.
   * @param {import('express').Response} res
   * @param {string} message
   * @param {number} [status=400]
   * @param {Array} [errors]     optional list of field/validation errors
   */
  error(res, message, status = 400, errors) {
    const body = { success: false, message };
    if (errors !== undefined) body.errors = errors;
    return res.status(status).json(body);
  },
};

module.exports = ApiResponse;
