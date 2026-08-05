/**
 * controllers/chat.controller.js
 * ---------------------------------------------------------------------------
 * HTTP layer for a single AI chat turn. It ORCHESTRATES the turn by composing
 * three services and nothing else:
 *
 *   - conversationService : owns conversation persistence + ownership rules
 *   - messageService      : owns message persistence (with ownership checks)
 *   - aiService           : owns the Gemini call (prompt in, text out)
 *
 * The controller itself holds NO business logic and NO SQL. It only:
 *   1. reads the validated body + authenticated user,
 *   2. sequences the services in the required order,
 *   3. shapes the exact HTTP response contract.
 *
 * All ownership checks, transactions, and AI error normalization live in the
 * services, so nothing here is duplicated (Single Responsibility Principle).
 *
 * Error handling is centralized: this handler is wrapped in `asyncHandler`, so
 * any thrown error (ours or a service's) is forwarded to `next()` and rendered
 * by the central error-handling middleware. We never touch the error `res`.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const conversationService = require('../services/conversation.service');
const messageService = require('../services/message.service');
const aiService = require('../services/ai.service');
const uploadService = require('../services/upload.service');
const { fetchImageAsBase64 } = require('../utils/imageFetcher');

/**
 * POST /api/chat/send  (route wiring lives elsewhere — this file exports the
 * handler only, per requirement).
 *
 * Request body:
 *   {
 *     conversationId?: number,  // optional — a new conversation is created if absent
 *     message: string           // required — the user's prompt
 *   }
 *
 * Success response (HTTP 201):
 *   {
 *     success: true,
 *     conversation:     object,  // the conversation the turn belongs to
 *     userMessage:      object,  // the persisted user message row
 *     assistantMessage: object   // the persisted assistant message row
 *   }
 *
 * @type {import('express').RequestHandler}
 */
const send = asyncHandler(async (req, res) => {
  // -------------------------------------------------------------------------
  // 1. Validate the request. We only accept a non-empty string `message`.
  //    (Field-level validators may also run as middleware; this is the last
  //    line of defense so the handler never proceeds on bad input.)
  // -------------------------------------------------------------------------
  const { conversationId, message } = req.body;

  if (typeof message !== 'string' || message.trim() === '') {
    throw new ApiError(400, 'A non-empty "message" is required.');
  }

  // -------------------------------------------------------------------------
  // 2. Verify the authenticated user. `authenticate` middleware sets req.user;
  //    guard here so a mis-wired route can never run unauthenticated.
  // -------------------------------------------------------------------------
  const userId = req.user && req.user.id;
  if (!userId) {
    throw new ApiError(401, 'Authentication required.');
  }

  // -------------------------------------------------------------------------
  // 3. Resolve the conversation.
  //    - No conversationId -> create a fresh conversation for this user.
  //    - conversationId    -> fetch it; the service enforces ownership and
  //                           throws 404 if it isn't the caller's.
  //    Either way we end up with a conversation we know the user owns.
  // -------------------------------------------------------------------------
  const conversation = conversationId
    ? await conversationService.getConversation(userId, conversationId)
    : await conversationService.createConversation(userId, {});

  // -------------------------------------------------------------------------
  // 4. Save the user's message. messageService re-checks ownership inside its
  //    own transaction and bumps the conversation's updated_at.
  // -------------------------------------------------------------------------
  const userMessage = await messageService.createMessage(userId, {
    conversationId: conversation.id,
    role: 'user',
    content: message,
  });

  // -------------------------------------------------------------------------
  // 5. Generate the assistant reply. aiService normalizes any Gemini/network
  //    failure into a clean Error, which the central handler renders.
  // -------------------------------------------------------------------------
  const assistantText = await aiService.generateResponse(message);

  // -------------------------------------------------------------------------
  // 6. Save the assistant's message.
  // -------------------------------------------------------------------------
  const assistantMessage = await messageService.createMessage(userId, {
    conversationId: conversation.id,
    role: 'assistant',
    content: assistantText,
  });

  // -------------------------------------------------------------------------
  // 7. Return the exact response contract with a 201 (a new turn was created).
  // -------------------------------------------------------------------------
  return res.status(201).json({
    success: true,
    conversation,
    userMessage,
    assistantMessage,
  });
});

/**
 * POST /api/chat/stream — the streaming (ChatGPT-style) counterpart to `send`.
 *
 * Same 7-step orchestration, but the assistant reply is streamed token-by-token
 * over Server-Sent Events (SSE) instead of returned in one JSON body:
 *
 *   1-4. validate, auth, resolve conversation, save the user message
 *        (identical to `send`, and done BEFORE any SSE header is written so a
 *         failure here still yields a normal JSON error).
 *   5.   open the SSE stream and forward each Gemini chunk as it arrives.
 *   6.   once streaming finishes, save the COMPLETE assistant reply to MySQL.
 *   7.   emit a final `done` event carrying the persisted rows.
 *
 * SSE event shapes (one JSON object per `data:` line):
 *   { "type": "chunk", "text": "..." }
 *   { "type": "done", "conversation": {...}, "userMessage": {...}, "assistantMessage": {...} }
 *   { "type": "error", "message": "..." }
 *
 * This handler is deliberately NOT wrapped in asyncHandler: once SSE headers are
 * sent we can't hand off to the JSON error handler, so post-header failures are
 * turned into `error` events here instead. Gemini logic lives entirely in
 * aiService — the controller only moves bytes.
 *
 * @type {import('express').RequestHandler}
 */
async function streamChat(req, res, next) {
  // ---- Phase 1: pre-stream work (normal JSON error path via next()) --------
  let userId;
  let conversation;
  let userMessage;
  let prompt;
  let image = null; // base64 image for Gemini Vision, when an imageUrl is sent
  try {
    const { conversationId, message, imageUrl } = req.body;

    if (typeof message !== 'string' || message.trim() === '') {
      throw new ApiError(400, 'A non-empty "message" is required.');
    }
    prompt = message.trim();

    userId = req.user && req.user.id;
    if (!userId) {
      throw new ApiError(401, 'Authentication required.');
    }

    // Optional image (Gemini Vision): download the Cloudinary image to base64
    // BEFORE we start streaming, so a bad URL fails as a normal JSON error.
    if (imageUrl) {
      image = await fetchImageAsBase64(imageUrl);
    }

    // Resolve (or create) the conversation the user owns.
    conversation = conversationId
      ? await conversationService.getConversation(userId, conversationId)
      : await conversationService.createConversation(userId, {});

    // Save the user's message BEFORE generation begins (requirement). When a
    // Vision image was sent, persist its Cloudinary URL on this user turn.
    userMessage = await messageService.createMessage(userId, {
      conversationId: conversation.id,
      role: 'user',
      content: prompt,
      imageUrl: imageUrl || null,
    });
  } catch (err) {
    // Nothing streamed yet -> let the central error handler render JSON.
    return next(err);
  }

  // ---- Phase 2: open the SSE stream ---------------------------------------
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Disable proxy buffering (e.g. nginx) so chunks flush immediately.
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = payload => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  // Handle client disconnects gracefully: abort the Gemini stream so we stop
  // generating (and paying) the moment the client goes away or presses Stop.
  const abort = new AbortController();
  let clientGone = false;
  res.on('close', () => {
    clientGone = true;
    abort.abort();
  });

  // ---- Phase 3: stream chunks, accumulating the full reply ----------------
  let fullText = '';
  let streamError = null;
  try {
    // Same streaming provider for text and vision: pass the image when present.
    for await (const chunk of aiService.streamResponse(prompt, {
      signal: abort.signal,
      image,
    })) {
      if (clientGone) break;
      fullText += chunk;
      sendEvent({ type: 'chunk', text: chunk });
    }
  } catch (err) {
    streamError = err;
  }

  // ---- Phase 4: persist the complete assistant reply ----------------------
  // Save whatever we accumulated (full on success, partial on Stop/disconnect)
  // so the conversation is never lost. Skip only when nothing was produced.
  let assistantMessage = null;
  if (fullText.trim()) {
    try {
      assistantMessage = await messageService.createMessage(userId, {
        conversationId: conversation.id,
        role: 'assistant',
        content: fullText,
      });
    } catch (err) {
      if (!streamError) {
        streamError = err;
      }
    }
  }

  // ---- Phase 5: finalize ---------------------------------------------------
  // Client already gone -> just close; there's no one to send `done`/`error` to.
  if (clientGone) {
    return res.end();
  }

  if (streamError) {
    sendEvent({ type: 'error', message: streamError.message || 'The AI service failed.' });
    return res.end();
  }

  sendEvent({ type: 'done', conversation, userMessage, assistantMessage });
  return res.end();
}

/**
 * POST /api/chat/upload-image  (JWT-protected, field name: "image")
 *
 * The upload middleware has already streamed the file to Cloudinary and set
 * req.file. This controller stays thin: delegate metadata extraction to the
 * upload service and shape the response contract. It does NOT call Gemini.
 *
 * Success (201):
 *   { success: true, data: { imageUrl, publicId, width, height, format, size } }
 *
 * @type {import('express').RequestHandler}
 */
const uploadImage = asyncHandler(async (req, res) => {
  const data = await uploadService.getImageMetadata(req.file);
  return res.status(201).json({ success: true, data });
});

module.exports = { send, streamChat, uploadImage };
