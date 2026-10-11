const config = require('../config');
const logger = require('./logger');

let channel = null;
let connection = null;

async function initRabbitMQ() {
  try {
    const amqplib = require('amqplib');
    connection = await amqplib.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertExchange('bookme.events', 'topic', { durable: true });
    logger.info('Connected to RabbitMQ on exchange bookme.events');
  } catch (err) {
    logger.warn(`RabbitMQ not available (${err.message}). Operating in HTTP-direct event dispatch mode.`);
    channel = null;
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    logger.debug(`[Mock RabbitMQ Publish] ${routingKey}:`, message);
    return false;
  }

  try {
    const payload = Buffer.from(JSON.stringify(message));
    channel.publish('bookme.events', routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
    });
    logger.info(`Published ${routingKey} to RabbitMQ`, { routingKey, message });
    return true;
  } catch (err) {
    logger.error(`Failed to publish ${routingKey}: ${err.message}`);
    return false;
  }
}

module.exports = {
  initRabbitMQ,
  publishEvent,
};
