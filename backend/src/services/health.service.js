/**
 * services/health.service.js
 * ---------------------------------------------------------------------------
 * Business logic for the health check. Kept separate from the controller so
 * the HTTP layer stays thin and this logic is unit-testable on its own.
 *
 * For now it returns a static status. It's the natural place to later add a
 * real DB ping (via config/db verifyConnection) if you want /api/health to
 * reflect dependency health.
 */

function getHealthStatus() {
  return {
    success: true,
    message: 'Backend running',
  };
}

module.exports = { getHealthStatus };
