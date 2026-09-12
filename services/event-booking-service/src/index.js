require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const eventRoutes = require('./modules/event/routes');
const bookingRoutes = require('./modules/booking/routes');
const { errorHandler, notFoundHandler } = require('./shared/middleware/errorHandler');
const { authMiddleware } = require('./shared/middleware/auth');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Make pool accessible to routes
app.locals.db = pool;

// Middleware
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Auth middleware for protected routes (optional, applied per route)
app.use('/api/events', authMiddleware);
app.use('/api/bookings', authMiddleware);

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'event-booking-service' });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Database connected');

    app.listen(port, () => {
      console.log(`Event Booking Service running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start service:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
