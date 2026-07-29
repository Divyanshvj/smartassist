/**
 * routes/health.routes.js
 * ---------------------------------------------------------------------------
 * Routes for the health feature. Each feature gets its own router file so the
 * URL surface stays easy to reason about as the API grows.
 */

const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health  (the '/api' prefix is applied where this router is mounted)
router.get('/health', getHealth);

module.exports = router;
