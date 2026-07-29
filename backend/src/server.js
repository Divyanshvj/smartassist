/**
 * server.js
 * ---------------------------------------------------------------------------
 * Process entry point. Responsibilities:
 *   - verify the database connection on boot (non-fatal so /api/health still
 *     works while MySQL is being set up),
 *   - start the HTTP server,
 *   - handle graceful shutdown and last-resort crash safety.
 *
 * Run with:  npm start   (or  npm run dev  for auto-reload)
 */

const app = require('./app');
const config = require('./config/env');
const { pool, verifyConnection } = require('./config/db');

function start() {
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[server] SmartAssist backend listening on http://localhost:${config.port} (${config.env})`,
    );
    // eslint-disable-next-line no-console
    console.log(`[server] Health check: http://localhost:${config.port}/api/health`);
  });

  // Verify the database in the background so startup (and /api/health) never
  // blocks on it. We only report the result; the server stays up either way.
  verifyConnection().then(dbOk => {
    // eslint-disable-next-line no-console
    console.log(
      dbOk
        ? '[db] Connected to MySQL.'
        : '[db] Not connected — server is still running (check your .env).',
    );
  });

  // Graceful shutdown: stop accepting connections, then close the DB pool.
  const shutdown = signal => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await pool.end();
      // eslint-disable-next-line no-console
      console.log('[server] Closed HTTP server and DB pool. Bye.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Last-resort safety nets so an unexpected error is logged, not silent.
process.on('unhandledRejection', reason => {
  // eslint-disable-next-line no-console
  console.error('[fatal] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', error => {
  // eslint-disable-next-line no-console
  console.error('[fatal] Uncaught exception:', error);
  process.exit(1);
});

start();
