/**
 * routes/chat.routes.js
 * ---------------------------------------------------------------------------
 * Routing for the AI chat feature. Pure wiring: it maps an HTTP verb + path to
 * middleware and a controller handler. There is NO business logic here — auth
 * lives in the middleware, orchestration in the controller, persistence in the
 * services.
 *
 * Mounted at `/chat` by routes/index.js, so the route below is publicly:
 *   POST /api/chat   (JWT-protected)
 */

const express = require('express');
const authenticate = require('../middleware/authenticate');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

// Every chat route requires a logged-in user. `authenticate` verifies the
// Bearer token and attaches `req.user`, or rejects with 401 before we reach
// the controller.
router.use(authenticate);

// POST /api/chat — run one chat turn (create/save messages + full AI reply).
router.post('/', chatController.send);

// POST /api/chat/stream — same turn, but stream the AI reply over SSE.
router.post('/stream', chatController.streamChat);

module.exports = router;
