/**
 * routes/message.routes.js
 * ---------------------------------------------------------------------------
 * Message endpoints, all JWT-protected via `router.use(authenticate)`.
 *
 *   POST /api/messages                    create a message
 *   GET  /api/messages/:conversationId    list a conversation's messages
 */

const express = require('express');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  createMessageValidator,
  conversationIdInParamValidator,
} = require('../validators/message.validator');
const messageController = require('../controllers/message.controller');

const router = express.Router();

router.use(authenticate); // all message routes require auth

router.post('/', createMessageValidator, validate, messageController.create);
router.get(
  '/:conversationId',
  conversationIdInParamValidator,
  validate,
  messageController.listByConversation,
);

module.exports = router;
