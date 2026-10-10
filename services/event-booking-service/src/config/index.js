const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const requiredEnvs = ['DATABASE_URL'];

for (const envName of requiredEnvs) {
  if (!process.env[envName] && process.env.NODE_ENV === 'production') {
    throw new Error(`[Config Error] Missing required environment variable: ${envName}`);
  }
}

const config = {
  port: parseInt(process.env.PORT || '4003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgres://user:password@localhost:5435/event_booking_db',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key-123',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  vendorServiceUrl: process.env.VENDOR_SERVICE_URL || 'http://localhost:3002',
  vendorClientMode: process.env.VENDOR_CLIENT_MODE || 'mock', // 'real' | 'mock'
  devAuthBypass: process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production',
};

module.exports = config;
