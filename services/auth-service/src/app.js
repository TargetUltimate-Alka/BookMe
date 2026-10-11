const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const internalRoutes = require('./routes/internalRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// 1. CORS Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key', 'X-Request-Id'],
  })
);

// 2. Body Parser
app.use(express.json());

// 3. Health Checks
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service', timestamp: new Date().toISOString() });
});
app.get('/api/auth/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service', timestamp: new Date().toISOString() });
});

// 4. Mount Routes (both with and without /api prefix for flexibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/internal', internalRoutes);
app.use('/internal', internalRoutes);

// 5. Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
