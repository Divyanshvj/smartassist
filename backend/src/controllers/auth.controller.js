/**
 * controllers/auth.controller.js
 * ---------------------------------------------------------------------------
 * The CONTROLLER layer: translates HTTP <-> service. It pulls the validated
 * body off the request, calls the service, and shapes the HTTP response. It
 * contains no business logic and no SQL.
 *
 * Each handler is wrapped in asyncHandler so any rejected promise (including
 * ApiError thrown by the service) is forwarded to the central error handler.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 * Success: 201 { success, message, data: { user } }
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await authService.signup({ name, email, password });

  return ApiResponse.success(res, 'Account created successfully.', { user }, 201);
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Success: 200 { success: true, token, user }
 *
 * This response intentionally uses the exact shape requested for login (token
 * and user at the top level) rather than the generic ApiResponse envelope.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { token, user } = await authService.login({ email, password });

  return res.status(200).json({ success: true, token, user });
});

module.exports = { signup, login };
