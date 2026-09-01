require('dotenv').config();
const express = require('express');
const initDb = require('./shared/initDb');
const vendorRoutes = require('./modules/vendor/routes/vendorRoutes');
const vendorController = require('./modules/vendor/controllers/vendorController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health Check Endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'vendor-service', timestamp: new Date() });
});

app.get('/api/vendors/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'vendor-service', timestamp: new Date() });
});

// Internal Endpoints for other microservices (event-booking, payment-feedback)
app.patch('/api/internal/vendors/:id/rating', vendorController.updateRating);
app.get('/api/internal/vendors/:id/summary', vendorController.getVendorSummary);
app.patch('/internal/vendors/:id/rating', vendorController.updateRating);
app.get('/internal/vendors/:id/summary', vendorController.getVendorSummary);

// Public / Protected Vendor Routes
app.use('/api/vendors', vendorRoutes);
app.use('/vendors', vendorRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

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
