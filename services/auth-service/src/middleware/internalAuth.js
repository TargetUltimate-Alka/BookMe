const crypto = require('crypto');
const config = require('../config');

/**
 * Middleware for securing service-to-service internal endpoints
 * Requires X-Internal-Key header to match the shared secret.
 */
function internalAuth(req, res, next) {
  const internalKey = req.header('X-Internal-Key');
  const traceId = req.traceId || req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

  if (!internalKey || internalKey !== config.internalApiKey) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Invalid or missing internal service key',
      details: [],
      traceId,
    });
  }

  next();
}

module.exports = internalAuth;
