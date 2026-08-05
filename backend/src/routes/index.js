/**
 * routes/index.js
 * ---------------------------------------------------------------------------
 * Aggregates every feature router under a single `/api` router. app.js mounts
 * this once at `/api`, and new features are added with a single line here
 * (e.g. `router.use(authRoutes)` when authentication arrives).
 */

const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const conversationRoutes = require('./conversation.routes');
const messageRoutes = require('./message.routes');
const chatRoutes = require('./chat.routes');
const uploadRoutes = require('./upload.routes');

const router = express.Router();

router.use(healthRoutes); // GET /api/health
router.use('/auth', authRoutes); // POST /api/auth/signup, /login
router.use('/conversations', conversationRoutes); // conversation CRUD
router.use('/messages', messageRoutes); // message create/list
router.use('/chat', chatRoutes); // POST /api/chat (AI)
router.use('/upload', uploadRoutes); // POST /api/upload/image (Cloudinary)

module.exports = router;
