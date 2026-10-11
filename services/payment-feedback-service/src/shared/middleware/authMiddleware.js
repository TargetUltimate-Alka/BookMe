const jwt = require('jsonwebtoken');
const config = require('../../config');

function authMiddleware(req, res, next) {
  // 1. Check Gateway forwarded headers first
  const gatewayUserId = req.headers['x-user-id'];
  const gatewayRole = req.headers['x-user-role'];

  if (gatewayUserId) {
    req.user = {
      id: gatewayUserId,
      role: gatewayRole || 'customer',
    };
    return next();
  }

  // 2. Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = {
        id: decoded.sub,
        role: decoded.role,
      };
      return next();
    } catch (err) {
      // If dev bypass enabled, log and continue, otherwise 401
      if (!config.devAuthBypass) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
            details: [err.message],
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }

  // 3. Dev Auth Bypass (local testing)
  if (config.devAuthBypass) {
    req.user = {
      id: 'usr_123',
      role: 'customer',
    };
    return next();
  }

  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      details: [],
      timestamp: new Date().toISOString(),
    },
  });
}

function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          details: [],
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${roles.join(', ')}`,
          details: [],
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
};
