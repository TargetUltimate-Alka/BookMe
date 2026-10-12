const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      keyGeneratorIpFallback: false,
      xForwardedForHeader: false,
      default: false,
    },
    keyGenerator: (req) => {
      // Key by IP and phone if present
      const phone = req.body?.phone ? String(req.body.phone).trim() : '';
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return phone ? `${ip}:${phone}` : ip;
    },
    handler: (req, res, next, options) => {
      const traceId = req.traceId || req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests, please try again later.',
        details: [],
        traceId,
      });
    },
  });
}

// 1. OTP Send limiter
const otpSendLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: 'Too many OTP requests for this phone number/IP. Please try again later.',
});

// 2. OTP Verify limiter
const otpVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 15,
  message: 'Too many OTP verification attempts. Please try again later.',
});

// 3. Login limiter
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 15,
  message: 'Too many login attempts. Please try again later.',
});

// General auth limiter
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  message: 'Too many requests from this IP.',
});

module.exports = {
  createRateLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
  authLimiter,
};
