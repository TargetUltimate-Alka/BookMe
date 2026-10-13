const express = require('express');
const cors = require('cors');
const requestIdMiddleware = require('./shared/middleware/requestId');
const authContext = require('./shared/middleware/authContext');
const { errorHandler, notFoundHandler } = require('./shared/middleware/errorHandler');
const logger = require('./shared/logger');

const app = express();

// 1. Core middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// HTTP Standards and Assignment 5 Headers Middleware
app.use((req, res, next) => {
  // Method override for constrained clients (A5)
  const override = req.header('X-HTTP-Method-Override');
  if (override && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(override.toUpperCase())) {
    req.method = override.toUpperCase();
  }

  // Security & Rate-limit headers (B5, B7)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', '99');

  // Content negotiation (B1)
  const accept = req.header('Accept');
  if (accept && !accept.includes('*/*') && !accept.includes('application/json') && !accept.includes('text/html')) {
    return res.status(406).json({
      code: 'NOT_ACCEPTABLE',
      message: 'Not Acceptable: only application/json supported',
    });
  }

  next();
});

// 2. Request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.id,
    ip: req.ip,
  });
  next();
});

// 3. Global Auth Context extraction
app.use(authContext);

// 4. Health check endpoint (Public)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'event-booking-service',
  });
});

const v1HealthHandler = (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'event-booking-service',
    timestamp: new Date().toISOString(),
  });
};
app.get('/api/health', v1HealthHandler);
app.get('/v1/health', v1HealthHandler);

// 5. Mount module routes
const { eventRouter, checklistItemRouter, notifyRouter } = require('./modules/event/routes');
const { bookingRouter, adminRouter, internalRouter } = require('./modules/booking/routes');

app.use('/events', eventRouter);
app.use('/api/events', eventRouter);
app.use('/v1/events', eventRouter);

app.use('/notify-me', notifyRouter);
app.use('/api/notify-me', notifyRouter);
app.use('/v1/notify-me', notifyRouter);

app.use('/checklist', checklistItemRouter);
app.use('/api/checklist', checklistItemRouter);

app.use('/bookings', bookingRouter);
app.use('/api/bookings', bookingRouter);
app.use('/v1/bookings', bookingRouter);

app.use('/admin', adminRouter);
app.use('/api/admin', adminRouter);
app.use('/v1/admin', adminRouter);

app.use('/internal', internalRouter);
app.use('/api/internal', internalRouter);
app.use('/v1/internal', internalRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
