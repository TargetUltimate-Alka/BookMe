const logger = require('../logger');

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || [];
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

  if (status >= 500) {
    logger.error(`Error [${code}]: ${message}`, { stack: err.stack, requestId });
  } else {
    logger.warn(`Client Error [${code}]: ${message}`, { requestId });
  }

  res.status(status).json({
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

module.exports = errorHandler;
