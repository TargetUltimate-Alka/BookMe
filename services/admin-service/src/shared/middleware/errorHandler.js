const logger = require('../logger');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, path: req.path });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    details: err.details || [],
    traceId: req.header('X-Request-Id') || `trace_${Date.now()}`,
  });
}

module.exports = errorHandler;
