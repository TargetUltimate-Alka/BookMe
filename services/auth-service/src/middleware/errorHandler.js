/**
 * Central Error Handler conforming to BookMe SRS §11
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || [];

  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error('[auth-service error]', err);
  }

  res.status(status).json({
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      details: [],
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
