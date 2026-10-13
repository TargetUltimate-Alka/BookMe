require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3001,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://user:password@localhost:5433/auth_db',

  // JWT configuration
  jwtSecret:
    process.env.JWT_SECRET ||
    'bookme_dev_shared_jwt_secret_2026_supersecure_key',
  jwtExpiresIn: parseInt(process.env.JWT_EXPIRES_IN, 10) || 900, // 900 seconds (15 minutes)
  refreshTokenExpiresDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10) || 7,

  // OTP configuration per SRS FR-ONB-01
  otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 300, // 5 minutes
  otpCooldownSeconds: parseInt(process.env.OTP_COOLDOWN_SECONDS, 10) || 30, // 30 seconds
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5, // 5 failed attempts locks account
  otpLockoutMinutes: parseInt(process.env.OTP_LOCKOUT_MINUTES, 10) || 15, // 15 minutes lockout

  // Data encryption key at rest (32 bytes hex or string)
  encryptionKey:
    process.env.DATA_ENCRYPTION_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',

  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key-123',
  nodeEnv: process.env.NODE_ENV || 'development',
};
