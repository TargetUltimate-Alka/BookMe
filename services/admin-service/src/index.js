const app = require('./app');
const config = require('./config');
const db = require('./shared/db');
const logger = require('./shared/logger');

let server;

async function startServer() {
  try {
    logger.info(`Starting admin-service on port ${config.port} (${config.nodeEnv})...`);
    await db.initDb();

    server = app.listen(config.port, () => {
      logger.info(`admin-service listening on port ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (err) {
    logger.error(`Failed to start admin-service: ${err.message}`, { stack: err.stack });
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
