const config = require('../../config');

/**
 * Extracts identity headers forwarded by the API Gateway
 * req.user = { id: string, role: 'customer' | 'vendor' | 'admin' }
 */
function authContext(req, res, next) {
  let userId = req.header('X-User-Id');
  let userRole = req.header('X-User-Role');

  // Development bypass when running without an API gateway
  if (!userId && config.devAuthBypass) {
    userId = req.header('X-Dev-User-Id') || 'dev_customer_1';
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
