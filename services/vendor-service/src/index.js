require('dotenv').config();
const app = require('./app');
const db = require('./shared/db');
const initDb = require('./shared/initDb');

const PORT = process.env.PORT || 3002;

let server = null;

async function startServer() {
  try {
    await initDb();
    server = app.listen(PORT, () => {
      console.log(`vendor-service listening on port ${PORT} (storage: ${db.isPgActive() ? 'PostgreSQL' : 'in-memory fallback'})`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start vendor-service:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  if (server) server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  if (server) server.close();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

app.startServer = startServer;
module.exports = app;
