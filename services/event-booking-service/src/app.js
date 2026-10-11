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

// 5. Mount module routes
const { eventRouter, checklistItemRouter } = require('./modules/event/routes');
const { bookingRouter, adminRouter, internalRouter } = require('./modules/booking/routes');

app.use('/events', eventRouter);
app.use('/api/events', eventRouter);

app.use('/checklist', checklistItemRouter);
app.use('/api/checklist', checklistItemRouter);

app.use('/bookings', bookingRouter);
app.use('/api/bookings', bookingRouter);

app.use('/admin', adminRouter);
app.use('/api/admin', adminRouter);

app.use('/internal', internalRouter);
app.use('/api/internal', internalRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
