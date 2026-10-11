const { startServer, app } = require('./server');

if (require.main === module) {
  startServer();
}

module.exports = app;
