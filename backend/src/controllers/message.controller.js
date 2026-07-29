/**
 * controllers/message.controller.js
 * ---------------------------------------------------------------------------
 * HTTP layer for messages. Thin: pulls user id + validated inputs, calls the
 * service, returns the response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const messageService = require('../services/message.service');

/** POST /api/messages */
const create = asyncHandler(async (req, res) => {
  const { conversationId, role, content } = req.body;
  const message = await messageService.createMessage(req.user.id, {
    conversationId,
    role,
    content,
  });
  return ApiResponse.success(res, 'Message created.', { message }, 201);
});

/** GET /api/messages/:conversationId */
const listByConversation = asyncHandler(async (req, res) => {
  const messages = await messageService.listMessages(
    req.user.id,
    req.params.conversationId,
  );
  return ApiResponse.success(res, 'Messages fetched.', { messages });
});

module.exports = { create, listByConversation };
