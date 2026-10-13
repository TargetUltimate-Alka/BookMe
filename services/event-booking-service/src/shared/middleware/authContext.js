const config = require('../../config');
const { verifyToken } = require('./auth');

/**
 * Extracts identity from either:
 * 1. Bearer JWT Authorization header (standard downstream verification per ADR-013)
 * 2. Gateway forwarded identity headers (X-User-Id, X-User-Role)
 * 3. Development bypass headers when running without gateway in dev/test mode
 */
function authContext(req, res, next) {
  // 1. Try Bearer JWT Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.sub,
        role: (decoded.role || 'customer').toLowerCase(),
        ...decoded,
      };
      return next();
    } catch (err) {
      req.tokenError = err.message;
      const fallbackUserId = req.header('X-User-Id') || (config.devAuthBypass ? req.header('X-Dev-User-Id') : null);
      if (fallbackUserId) {
        req.user = {
          id: fallbackUserId,
          role: (req.header('X-User-Role') || req.header('X-Dev-User-Role') || 'customer').toLowerCase(),
        };
        return next();
      }
      req.user = null;
      return next();
    }
  }

  // 2. Gateway forwarded or test headers
  let userId = req.header('X-User-Id');
  let userRole = req.header('X-User-Role');

  // Development bypass when running without an API gateway
  if (!userId && config.devAuthBypass) {
    userId = req.header('X-Dev-User-Id');
    userRole = req.header('X-Dev-User-Role') || 'customer';
  }

  if (userId) {
    req.user = {
      id: userId,
      role: (userRole || 'customer').toLowerCase(),
    };
  } else {
    req.user = null;
  }

  next();
}

module.exports = authContext;
