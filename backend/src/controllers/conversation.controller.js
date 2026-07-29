/**
 * controllers/conversation.controller.js
 * ---------------------------------------------------------------------------
 * HTTP layer for conversations. Reads the authenticated user id from `req.user`
 * (set by the authenticate middleware) and the validated body/params, delegates
 * to the service, and shapes the response. No business logic or SQL here.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const conversationService = require('../services/conversation.service');

/** POST /api/conversations */
const create = asyncHandler(async (req, res) => {
  const { title, message } = req.body;
  const conversation = await conversationService.createConversation(req.user.id, {
    title,
    message,
  });
  return ApiResponse.success(res, 'Conversation created.', { conversation }, 201);
});

/** GET /api/conversations */
const list = asyncHandler(async (req, res) => {
  const conversations = await conversationService.listConversations(req.user.id);
  return ApiResponse.success(res, 'Conversations fetched.', { conversations });
});

/** GET /api/conversations/:id */
const getOne = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getConversation(
    req.user.id,
    req.params.id,
  );
  return ApiResponse.success(res, 'Conversation fetched.', { conversation });
});

/** DELETE /api/conversations/:id */
const remove = asyncHandler(async (req, res) => {
  await conversationService.deleteConversation(req.user.id, req.params.id);
  return ApiResponse.success(res, 'Conversation deleted.');
});

module.exports = { create, list, getOne, remove };
