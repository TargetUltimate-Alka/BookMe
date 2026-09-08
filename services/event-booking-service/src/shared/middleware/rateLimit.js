/**
 * Rate limiting middleware
 * Status: Implements "Rate-limit headers and a 429 response" requirement
 */

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    const err = new Error('Too Many Requests');
    err.status = 429;
    err.details = [
      {
        issue: 'Rate limit exceeded',
        retryAfter: req.rateLimit.resetTime,
      },
    ];
    res.status(429).json({
      error: {
        status: 429,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// Stricter limiter for booking creation (prevent spam)
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 booking attempts per hour
  skipSuccessfulRequests: false,
  message: 'Too many bookings attempted, please try again later.',
  handler: (req, res) => {
    const err = new Error('Too Many Requests');
    err.status = 429;
    err.details = [
      {
        issue: 'Booking rate limit exceeded',
        retryAfter: req.rateLimit.resetTime,
      },
    ];
    res.status(429).json({
      error: {
        status: 429,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

module.exports = {
  apiLimiter,
  bookingLimiter,
};
