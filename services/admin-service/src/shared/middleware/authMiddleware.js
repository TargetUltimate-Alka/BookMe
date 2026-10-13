const jwt = require('jsonwebtoken');
const config = require('../../config');

function authMiddleware(req, res, next) {
  // Support Gateway header forwarding and Dev Bypass
  const devRole = req.header('X-User-Role') || req.header('x-user-role');
  const devUserId = req.header('X-User-Id') || req.header('x-user-id');

  if (devRole) {
    req.user = {
      id: devUserId || 'usr_dev_admin',
      role: devRole,
      roles: [devRole],
    };
    return next();
  }

  const authHeader = req.header('Authorization') || req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (config.devAuthBypass) {
      req.user = {
        id: 'usr_superadmin_01',
        role: 'superAdmin',
        roles: ['superAdmin'],
      };
      return next();
    }
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication credentials are required',
      details: [{ field: 'Authorization', issue: 'Missing or invalid Bearer token' }],
    });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const roles = Array.isArray(payload.roles)
      ? payload.roles
      : [payload.role || 'superAdmin'];

    req.user = {
      id: payload.sub || payload.id || 'usr_admin',
      role: payload.role || roles[0],
      roles,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Access token is expired or invalid',
      details: [{ field: 'token', issue: err.message }],
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      });
    }

    const userRoles = req.user.roles || [req.user.role];
    const hasRole =
      userRoles.includes('superAdmin') ||
      userRoles.some((r) => allowedRoles.includes(r));

    if (!hasRole) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
};
