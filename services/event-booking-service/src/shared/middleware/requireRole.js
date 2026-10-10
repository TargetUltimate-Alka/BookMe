/**
 * Role-based authorization middleware
 * @param {string[]|string} allowedRoles - 'customer', 'vendor', 'admin'
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      const err = new Error('Authentication required');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      err.details = [{ issue: 'Missing X-User-Id header' }];
      return next(err);
    }

    // Admin role has universal read/override permission if 'admin' is included or generally authorized
    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      const err = new Error(`Access forbidden for role: ${req.user.role}`);
      err.status = 403;
      err.code = 'FORBIDDEN';
      err.details = [{ allowedRoles: roles, currentRole: req.user.role }];
      return next(err);
    }

    next();
  };
}

module.exports = requireRole;
