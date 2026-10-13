/**
 * Role-based authorization middleware
 * @param {string[]|string} allowedRoles - 'customer', 'vendor', 'superAdmin', 'supportAgent', etc.
 */
function requireRole(allowedRoles) {
  const roles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) => r.toLowerCase());

  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      const err = new Error('Authentication required');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      err.details = [{ issue: req.tokenError || 'Missing authentication credentials' }];
      return next(err);
    }

    const currentRole = (req.user.role || '').toLowerCase();
    const isAdmin = currentRole === 'admin' || currentRole === 'superadmin';

    // Allow if role matches, or if admin/superAdmin is an authorized supervisor
    if (!roles.includes(currentRole) && !isAdmin) {
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
