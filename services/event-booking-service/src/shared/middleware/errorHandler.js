const logger = require('../logger');

/**
 * Standard error response formatter conforming to OpenAPI common.yaml ErrorResponse
 * Required fields: code, message, traceId (plus optional details array)
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code =
    err.code ||
    (status === 400
      ? 'VALIDATION_ERROR'
      : status === 401
      ? 'UNAUTHORIZED'
      : status === 403
      ? 'FORBIDDEN'
      : status === 404
      ? 'NOT_FOUND'
      : status === 409
      ? 'CONFLICT'
      : status === 429
      ? 'RATE_LIMIT_EXCEEDED'
      : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || [];
  const requestId = req.id || req.traceId || req.header('X-Request-Id') || 'unknown';

  if (status >= 500) {
    logger.error(`Server Error: ${message}`, { status, code, stack: err.stack, requestId });
  } else {
    logger.warn(`Client Error: ${message}`, { status, code, details, requestId });
  }

  res.status(status).json({
    code,
    message,
    details,
    traceId: requestId,
    // Retain error property for legacy callers & existing tests expecting res.body.error
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
      ...(process.env.NODE_ENV === 'development' && status >= 500 ? { stack: err.stack } : {}),
    },
  });
}

function notFoundHandler(req, res, next) {
  const err = new Error(`Cannot ${req.method} ${req.path}`);
  err.status = 404;
  err.code = 'NOT_FOUND';
  err.details = [{ path: req.path, method: req.method }];
  next(err);
}

module.exports = { errorHandler, notFoundHandler };
