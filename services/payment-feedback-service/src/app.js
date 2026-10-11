const express = require('express');
const cors = require('cors');
const errorHandler = require('./shared/middleware/errorHandler');

const paymentRoutes = require('./modules/payment/routes/paymentRoutes');
const payoutRoutes = require('./modules/payment/routes/payoutRoutes');
const reviewRoutes = require('./modules/review/routes/reviewRoutes');
const complaintRoutes = require('./modules/complaint/routes/complaintRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'payment-feedback-service',
    timestamp: new Date().toISOString(),
  });
});

// Mounted routes (both with and without /api prefix for flexibility)
app.use('/api/payments', paymentRoutes);
app.use('/payments', paymentRoutes);

app.use('/api/payouts', payoutRoutes);
app.use('/payouts', payoutRoutes);

app.use('/api/reviews', reviewRoutes);
app.use('/reviews', reviewRoutes);

app.use('/api/complaints', complaintRoutes);
app.use('/complaints', complaintRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      details: [],
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
    },
  });
});

// SRS §11 Error Handler
app.use(errorHandler);

module.exports = app;
