/**
 * validators/message.validator.js
 * ---------------------------------------------------------------------------
 * express-validator chains for the message endpoints.
 */

const { body, param } = require('express-validator');

/** POST /api/messages */
const createMessageValidator = [
  body('conversationId')
    .notEmpty()
    .withMessage('conversationId is required.')
    .bail()
    .isInt({ min: 1 })
    .withMessage('conversationId must be a positive integer.')
    .toInt(),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required.')
    .bail()
    .isLength({ max: 10000 })
    .withMessage('Message is too long.'),

  // No AI yet, so callers normally omit this (defaults to 'user'); but if sent,
  // it must be one of the allowed roles.
  body('role')
    .optional()
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Invalid role.'),
];

/** GET /api/messages/:conversationId */
const conversationIdInParamValidator = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation id.')
    .toInt(),
];

module.exports = { createMessageValidator, conversationIdInParamValidator };
