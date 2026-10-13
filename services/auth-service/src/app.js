const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const authRoutes = require('./routes/authRoutes');
const internalRoutes = require('./routes/internalRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// 1. Trace ID Middleware (for log traceability and RFC standard ErrorResponse)
app.use((req, res, next) => {
  req.traceId = req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  res.setHeader('X-Request-Id', req.traceId);
  next();
});

// 2. CORS Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key', 'X-Request-Id', 'Idempotency-Key'],
  })
);

// 3. Body Parser
app.use(express.json());

// 4. Health Checks
app.get(['/health', '/v1/auth/health', '/api/auth/health'], (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// 5. Mount Routes
// Primary path according to contracts/openapi/identity.yaml (servers url: https://api.bookme.com/v1)
app.use('/v1/auth', authRoutes);
app.use('/v1/internal', internalRoutes);

// Backwards-compatible aliases for local dev & internal service calls
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/internal', internalRoutes);
app.use('/internal', internalRoutes);

// 6. Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
