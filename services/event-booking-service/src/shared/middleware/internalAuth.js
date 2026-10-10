const config = require('../../config');

/**
 * Service-to-service internal authentication using shared secret header
 */
function internalAuth(req, res, next) {
  const key = req.header('X-Internal-Key');

  if (!key || key !== config.internalApiKey) {
    const err = new Error('Invalid or missing internal API key');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    err.details = [{ header: 'X-Internal-Key', issue: 'Missing or mismatch' }];
    return next(err);
  }

  next();
}

module.exports = internalAuth;
