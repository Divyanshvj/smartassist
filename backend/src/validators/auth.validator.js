/**
 * validators/auth.validator.js
 * ---------------------------------------------------------------------------
 * express-validator rule chains for the auth endpoints. These are declarative:
 * each `body(...)` describes what a valid field looks like. They run as
 * middleware BEFORE the controller, and the `validate` middleware then decides
 * whether to proceed or reject. Keeping rules here (not in the controller)
 * keeps validation reusable and the controller thin.
 */

const { body } = require('express-validator');

/**
 * Rules for POST /api/auth/signup.
 * `.bail()` stops running later checks on a field once one has failed, so the
 * client gets the most relevant single message per field.
 */
const signupValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .bail()
    .isLength({ max: 100 })
    .withMessage('Name must be at most 100 characters.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .bail()
    .isEmail()
    .withMessage('Enter a valid email address.'),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .bail()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
];

/**
 * Rules for POST /api/auth/login.
 * Note: we only check that a password is present, NOT its length. The
 * min-length policy belongs to signup; re-checking it here would leak policy
 * details and reject legacy passwords for no benefit.
 */
const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .bail()
    .isEmail()
    .withMessage('Enter a valid email address.'),

  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = { signupValidator, loginValidator };
