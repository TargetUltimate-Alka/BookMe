const EventEmitter = require('events');
const config = require('../config');
const logger = require('./logger');

const inMemoryBus = new EventEmitter();

let amqpConnection = null;
let amqpChannel = null;
const EXCHANGE_NAME = 'bookme.events';
const QUEUE_NAME = 'event-booking.q';

/**
 * Connect to RabbitMQ with automatic fallback to in-memory event bus
 */
async function initRabbit(consumers = {}) {
  try {
    let amqplib;
    try {
      amqplib = require('amqplib');
    } catch (e) {
      logger.warn('amqplib module not installed. Running RabbitMQ in in-memory mock mode.');
      setupInMemoryConsumers(consumers);
      return;
    }

    logger.info(`Connecting to RabbitMQ at ${config.rabbitmqUrl}...`);
    amqpConnection = await amqplib.connect(config.rabbitmqUrl);
    amqpChannel = await amqpConnection.createChannel();

    await amqpChannel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    await amqpChannel.assertQueue(QUEUE_NAME, { durable: true });

    // Bind queue to subscribed topics
    const topics = Object.keys(consumers);
    for (const topic of topics) {
      await amqpChannel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, topic);
      logger.info(`Bound RabbitMQ queue ${QUEUE_NAME} to topic: ${topic}`);
    }

    // Consume messages
    amqpChannel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      const routingKey = msg.fields.routingKey;
      const content = msg.content.toString();
      logger.info(`RabbitMQ event received: [${routingKey}]`);

      try {
        const payload = JSON.parse(content);
        if (consumers[routingKey]) {
          await consumers[routingKey](payload);
        }
        amqpChannel.ack(msg);
      } catch (err) {
        logger.error(`Error processing RabbitMQ event [${routingKey}]: ${err.message}`, { error: err.stack });
        // Reject and don't requeue if malformed to prevent poison pill loops
        amqpChannel.nack(msg, false, false);
      }
    });

    amqpConnection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', { error: err.message });
    });

    amqpConnection.on('close', () => {
      logger.warn('RabbitMQ connection closed.');
    });

    logger.info('RabbitMQ initialized successfully.');
  } catch (err) {
    logger.warn(`Could not connect to RabbitMQ broker: ${err.message}. Operating in in-memory mock mode.`);
    setupInMemoryConsumers(consumers);
  }
}

function setupInMemoryConsumers(consumers) {
  for (const [topic, handler] of Object.entries(consumers)) {
    inMemoryBus.on(topic, async (payload) => {
      try {
        logger.info(`[In-Memory Mock Bus] Event triggered: [${topic}]`);
        await handler(payload);
      } catch (err) {
        logger.error(`[In-Memory Mock Bus] Handler error for [${topic}]: ${err.message}`);
      }
    });
  }
}

/**
 * Publish an asynchronous domain event
 */
async function publishEvent(routingKey, message) {
  const payload = {
    eventId: message.eventId || message.id || undefined,
    timestamp: new Date().toISOString(),
    ...message,
  };

  const buffer = Buffer.from(JSON.stringify(payload));

  if (amqpChannel) {
    try {
      amqpChannel.publish(EXCHANGE_NAME, routingKey, buffer, { persistent: true });
      logger.info(`Published RabbitMQ event [${routingKey}]`, { routingKey, payload });
      return;
    } catch (err) {
      logger.error(`Failed to publish RabbitMQ event [${routingKey}]: ${err.message}`);
    }
  }

  // In-memory bus fallback
  logger.info(`[In-Memory Mock Bus] Published [${routingKey}]`);
  inMemoryBus.emit(routingKey, payload);
}

async function closeRabbit() {
  try {
    if (amqpChannel) await amqpChannel.close();
    if (amqpConnection) await amqpConnection.close();
  } catch (err) {
    logger.error('Error closing RabbitMQ connection:', { error: err.message });
  }
}

module.exports = {
  initRabbit,
  publishEvent,
  closeRabbit,
  inMemoryBus,
};
