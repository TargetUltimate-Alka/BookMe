const app = require('./app');
const config = require('./config');
const initDb = require('./db/initDb');

let server;

async function startServer() {
  try {
    console.log(`[auth-service] Starting auth-service in ${config.nodeEnv} mode...`);

    // Initialize database tables
    await initDb();

    server = app.listen(config.port, () => {
      console.log(`[auth-service] Listening on port ${config.port}`);
    });
  } catch (err) {
    console.error('[auth-service] Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  if (server) server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  if (server) server.close();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = { startServer, app };
