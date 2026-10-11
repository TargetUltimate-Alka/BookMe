require('dotenv').config();
const express = require('express');
const initDb = require('./shared/initDb');
const vendorRoutes = require('./modules/vendor/routes/vendorRoutes');
const vendorController = require('./modules/vendor/controllers/vendorController');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Enable CORS for frontend clients (Vite, local HTML, etc.)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health Check Endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'vendor-service', timestamp: new Date() });
});

app.get('/api/vendors/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'vendor-service', timestamp: new Date() });
});

const internalRoutes = require('./modules/vendor/routes/internalRoutes');

// Internal Endpoints for other microservices (event-booking, payment-feedback)
app.use('/internal', internalRoutes);
app.use('/api/internal', internalRoutes);
app.patch('/api/internal/vendors/:id/rating', vendorController.updateRating);
app.get('/api/internal/vendors/:id/summary', vendorController.getVendorSummary);
app.patch('/internal/vendors/:id/rating', vendorController.updateRating);
app.get('/internal/vendors/:id/summary', vendorController.getVendorSummary);

// Public / Protected Vendor Routes
app.use('/api/vendors', vendorRoutes);
app.use('/vendors', vendorRoutes);

const { errorHandler } = require('./shared/middleware/errorHandler');

// Global Error Handler
app.use(errorHandler);

async function startServer() {
  try {
    // Initialize DB schema
    await initDb();

    app.listen(PORT, () => {
      console.log(`vendor-service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start vendor-service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
