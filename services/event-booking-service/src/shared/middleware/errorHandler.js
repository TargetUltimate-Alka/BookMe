/**
 * Consistent error response format across all endpoints
 * Status: Implements "One consistent error body, everywhere" requirement
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default to 500 if no status code
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const details = err.details || [];

  res.status(status).json({
    error: {
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

const notFoundHandler = (req, res) => {
  const err = new Error('Not Found');
  err.status = 404;
  err.details = [{ path: req.path, method: req.method }];
  errorHandler(err, req, res);
};

module.exports = { errorHandler, notFoundHandler };
