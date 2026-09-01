require('dotenv').config();
const express = require('express');
const initDb = require('./shared/initDb');

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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
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

startServer();
