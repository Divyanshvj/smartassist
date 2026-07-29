/**
 * controllers/health.controller.js
 * ---------------------------------------------------------------------------
 * HTTP layer for the health check. Controllers translate between HTTP and the
 * service layer: read the request, call a service, shape the response. They
 * contain no business logic themselves.
 */

const healthService = require('../services/health.service');

/**
 * GET /api/health
 * Returns: { "success": true, "message": "Backend running" }
 */
function getHealth(req, res) {
  const status = healthService.getHealthStatus();
  return res.status(200).json(status);
}

module.exports = { getHealth };
