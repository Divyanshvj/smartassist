/**
 * routes/conversation.routes.js
 * ---------------------------------------------------------------------------
 * Conversation endpoints. `router.use(authenticate)` protects EVERY route in
 * this file, so all of them require a valid JWT and populate req.user before
 * the controller runs.
 *
 *   POST   /api/conversations       create
 *   GET    /api/conversations       list (current user's only)
 *   GET    /api/conversations/:id   get one
 *   DELETE /api/conversations/:id   delete
 */

const express = require('express');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  createConversationValidator,
  conversationIdParamValidator,
} = require('../validators/conversation.validator');
const conversationController = require('../controllers/conversation.controller');

const router = express.Router();

router.use(authenticate); // all conversation routes require auth

router.post('/', createConversationValidator, validate, conversationController.create);
router.get('/', conversationController.list);
router.get('/:id', conversationIdParamValidator, validate, conversationController.getOne);
router.delete('/:id', conversationIdParamValidator, validate, conversationController.remove);

module.exports = router;
