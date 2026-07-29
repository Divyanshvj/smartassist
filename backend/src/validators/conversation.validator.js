/**
 * validators/conversation.validator.js
 * ---------------------------------------------------------------------------
 * express-validator chains for the conversation endpoints. They run as
 * middleware before the controller; the shared `validate` middleware turns any
 * failures into a 422 via the central error handler.
 */

const { body, param } = require('express-validator');

/** POST /api/conversations — title and initial message are both optional. */
const createConversationValidator = [
  body('title')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters.'),

  body('message')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty.')
    .bail()
    .isLength({ max: 10000 })
    .withMessage('Message is too long.'),
];

/** :id path param must be a positive integer (coerced to a number). */
const conversationIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation id.')
    .toInt(),
];

module.exports = { createConversationValidator, conversationIdParamValidator };
