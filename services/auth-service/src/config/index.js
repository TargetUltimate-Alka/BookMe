require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3001,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://user:password@localhost:5433/auth_db',
  jwtSecret:
    process.env.JWT_SECRET ||
    'bookme_dev_shared_jwt_secret_2026_supersecure_key',
  jwtExpiresIn: 900, // 900 seconds (15 minutes) as per SRS and contracts
  refreshTokenExpiresDays: 7,
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key-123',
  nodeEnv: process.env.NODE_ENV || 'development',
};
