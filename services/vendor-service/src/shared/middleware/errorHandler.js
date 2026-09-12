/**
 * Global standardized error handler middleware for vendor-service.
 */
function errorHandler(err, req, res, next) {
  console.error('[vendor-service] Error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

module.exports = {
  errorHandler,
};
