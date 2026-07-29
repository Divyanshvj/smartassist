/**
 * app.js
 * ---------------------------------------------------------------------------
 * Builds and configures the Express application, but does NOT start listening.
 * Keeping "build the app" (here) separate from "start the server" (server.js)
 * means tests can import the fully-wired `app` without opening a port.
 *
 * Middleware order matters and flows top-to-bottom:
 *   1. helmet   — secure HTTP headers
 *   2. cors     — cross-origin access (needed by the React Native app)
 *   3. morgan   — request logging
 *   4. parsers  — JSON / urlencoded body parsing
 *   5. routes   — the actual API under /api
 *   6. notFound — anything unmatched -> 404
 *   7. errorHandler — final catch-all (must be last)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. Security headers.
app.use(helmet());

// 2. CORS. When corsOrigin is '*' we allow any origin; otherwise restrict to
//    the configured allow-list.
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true,
  }),
);

// 3. Request logging — concise in production, verbose in development.
app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// 4. Body parsers.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. API routes.
app.use('/api', routes);

// 6. Unmatched routes -> consistent 404.
app.use(notFound);

// 7. Central error handler (declared last).
app.use(errorHandler);

module.exports = app;
