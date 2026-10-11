require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3004,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://user:password@localhost:5436/payment_feedback_db',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_prod',
  devAuthBypass: process.env.DEV_AUTH_BYPASS !== 'false',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key-123',
  eventBookingServiceUrl:
    process.env.EVENT_BOOKING_SERVICE_URL || 'http://localhost:4003',
  vendorServiceUrl:
    process.env.VENDOR_SERVICE_URL || 'http://localhost:3002',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  commissionRate: Number(process.env.COMMISSION_RATE || 0.1), // 10% platform commission
};
