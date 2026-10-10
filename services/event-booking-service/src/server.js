const app = require('./app');
const config = require('./config');
const { runMigrations } = require('./shared/db/migrationsRunner');
const { initRabbit, closeRabbit } = require('./shared/rabbit');
const logger = require('./shared/logger');

const { consumers } = require('./modules/booking/events/consumers');
const { startExpiryJob, stopExpiryJob } = require('./jobs/expiryJob');

let server;

async function startServer() {
  try {
    logger.info(`Starting event-booking-service in ${config.nodeEnv} mode...`);

    // 1. Run database migrations
    try {
      await runMigrations();
    } catch (dbErr) {
      logger.warn(`Database migrations failed or DB unreachable: ${dbErr.message}`);
    }

    // 2. Initialize RabbitMQ with event consumers
    try {
      await initRabbit(consumers);
    } catch (mqErr) {
      logger.warn(`RabbitMQ initialization warning: ${mqErr.message}`);
    }

    // 3. Start Background Expiry Jobs
    startExpiryJob();

    // 4. Start listening
    server = app.listen(config.port, () => {
      logger.info(`event-booking-service listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  stopExpiryJob();
  if (server) server.close();
  await closeRabbit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  stopExpiryJob();
  if (server) server.close();
  await closeRabbit();
  process.exit(0);
});

// Start if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer, app };
