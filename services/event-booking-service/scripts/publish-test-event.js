/**
 * Script to simulate asynchronous payment events from payment-feedback-service
 *
 * Usage:
 *   node scripts/publish-test-event.js --type=payment.completed --bookingId=<id> [--amount=120000]
 *   node scripts/publish-test-event.js --type=payment.failed --bookingId=<id>
 *   node scripts/publish-test-event.js --type=payment.refunded --bookingId=<id>
 */

const { publishEvent } = require('../src/shared/rabbit');
const logger = require('../src/shared/logger');

async function main() {
  const args = process.argv.slice(2);
  const params = {};

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      params[key] = value || true;
    }
  });

  const eventType = params.type || 'payment.completed';
  const bookingId = params.bookingId || 'bkg-demo-2001';
  const amount = Number(params.amount) || 120000.0;

  logger.info(`Simulating incoming event: "${eventType}" for booking: ${bookingId}...`);

  let payload = {};

  switch (eventType) {
    case 'payment.completed':
      payload = {
        bookingId,
        paymentId: `pay-${Date.now()}`,
        amount,
        currency: 'INR',
        transactionDate: new Date().toISOString(),
        paymentMethod: 'UPI',
      };
      break;

    case 'payment.failed':
      payload = {
        bookingId,
        paymentId: `pay-${Date.now()}`,
        reason: params.reason || 'Insufficient funds / Bank transaction timeout',
        timestamp: new Date().toISOString(),
      };
      break;

    case 'payment.refunded':
      payload = {
        bookingId,
        refundId: `ref-${Date.now()}`,
        amount,
        currency: 'INR',
        reason: params.reason || 'Customer requested cancellation prior to lock date',
        timestamp: new Date().toISOString(),
      };
      break;

    default:
      logger.error(`Unknown event type "${eventType}". Expected payment.completed | payment.failed | payment.refunded`);
      process.exit(1);
  }

  try {
    await publishEvent(eventType, payload);
    logger.info(`✅ Successfully dispatched "${eventType}" to RabbitMQ exchange/event bus.`);
    logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);
  } catch (err) {
    logger.error(`Failed to dispatch event: ${err.message}`);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = main;
