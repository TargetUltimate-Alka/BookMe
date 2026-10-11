const app = require('./app');
const config = require('./config');
const { initDb } = require('./shared/initDb');
const { initRabbitMQ } = require('./shared/rabbitmq');
const logger = require('./shared/logger');

async function start() {
  try {
    // 1. Initialize Database schema or fallback store
    await initDb();

    // 2. Initialize optional RabbitMQ connection
    await initRabbitMQ();

    // 3. Start listening
    const server = app.listen(config.port, () => {
      logger.info(`payment-feedback-service running on port ${config.port} (${config.nodeEnv})`);
      logger.info(`Base URLs: http://localhost:${config.port}/api/payments`);
    });

    const shutdown = () => {
      logger.info('Shutting down payment-feedback-service...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error(`Fatal startup error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

start();
