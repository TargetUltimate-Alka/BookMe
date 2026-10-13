const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('./shared/middleware/authMiddleware');
const errorHandler = require('./shared/middleware/errorHandler');
const adminRoutes = require('./modules/adminRoutes');
const db = require('./shared/db');

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
function healthHandler(req, res) {
  res.status(200).json({
    status: 'UP',
    service: 'admin-service',
    postgresConnected: db.isPgActive(),
    storageMode: db.isPgActive() ? 'postgresql' : 'in_memory_fallback',
    timestamp: new Date().toISOString(),
  });
}

app.get('/health', healthHandler);
app.get('/api/admin/health', healthHandler);
app.get('/v1/admin/health', healthHandler);

// Protected Admin API Routes
app.use('/admin', authMiddleware, adminRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/v1/admin', authMiddleware, adminRoutes);

// Error Handler
app.use(errorHandler);

module.exports = app;
