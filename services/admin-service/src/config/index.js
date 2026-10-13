require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3005,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://user:password@localhost:5437/admin_db',
  jwtSecret:
    process.env.JWT_SECRET ||
    'bookme_dev_shared_jwt_secret_2026_supersecure_key',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key-123',
  nodeEnv: process.env.NODE_ENV || 'development',
  devAuthBypass: process.env.DEV_AUTH_BYPASS !== 'false',
};
