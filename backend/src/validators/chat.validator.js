/**
 * validators/chat.validator.js
 * ---------------------------------------------------------------------------
 * Request validation for POST /api/chat/send. Runs before the controller; the
 * shared `validate` middleware turns failures into a 422.
 */

const { body } = require('express-validator');

const sendChatValidator = [
  body('conversationId')
    .notEmpty()
    .withMessage('conversationId is required.')
    .bail()
    .isInt({ min: 1 })
    .withMessage('conversationId must be a positive integer.')
    .toInt(),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('message is required.')
    .bail()
    .isLength({ max: 10000 })
    .withMessage('message is too long.'),
];

module.exports = { sendChatValidator };
