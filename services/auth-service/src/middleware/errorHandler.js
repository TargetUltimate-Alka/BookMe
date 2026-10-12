const crypto = require('crypto');

const VALID_ERROR_CODES = new Set([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INVALID_STATE_TRANSITION',
  'CAPACITY_UNAVAILABLE',
  'WALLET_BELOW_MINIMUM',
  'INSUFFICIENT_WALLET_BALANCE',
  'PII_BLOCKED',
  'REVIEW_NOT_ALLOWED',
  'REVIEW_WINDOW_EXPIRED',
  'DAMAGE_CLAIM_EXPIRED',
  'UNSUPPORTED_MEDIA_TYPE',
  'DUPLICATE_MEDIA_HASH',
  'RATE_LIMIT_EXCEEDED',
  'UPSTREAM_GATEWAY_ERROR',
  'INTERNAL_SERVER_ERROR',
]);

function normalizeErrorCode(rawCode, status) {
  if (VALID_ERROR_CODES.has(rawCode)) {
    return rawCode;
  }
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = normalizeErrorCode(err.code, status);
  const message = err.message || 'An unexpected error occurred';
  const details = Array.isArray(err.details) ? err.details : [];
  const traceId = req.traceId || req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

  if (err.retryAfter) {
    res.set('Retry-After', String(err.retryAfter));
  }

  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error('[auth-service error]', err);
  }

  // Top-level ErrorResponse conforming to contracts/openapi/common.yaml
  return res.status(status).json({
    code,
    message,
    details,
    traceId,
  });
}

function notFoundHandler(req, res) {
  const traceId = req.traceId || req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  return res.status(404).json({
    code: 'NOT_FOUND',
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    details: [],
    traceId,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
