const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware to authenticate requests using JWT Bearer token
 * Adheres strictly to the token format defined in contracts/auth-service.md:
 * Payload: { sub: "usr_...", role: "customer" | "vendor", iat: ..., exp: ... }
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'MISSING_AUTH_TOKEN',
        message: 'Authentication token is required',
        details: [],
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };
    req.token = token;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired ? 'Access token has expired' : 'Invalid authentication token',
        details: [],
      },
    });
  }
}

module.exports = authMiddleware;
