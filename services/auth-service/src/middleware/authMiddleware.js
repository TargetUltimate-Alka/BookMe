const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

/**
 * Middleware to authenticate requests using JWT Bearer token
 * Token format: { sub: "...", role: "...", iat: ..., exp: ... }
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const traceId = req.traceId || req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication token is required',
      details: [],
      traceId,
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
      code: 'UNAUTHORIZED',
      message: isExpired ? 'Access token has expired' : 'Invalid authentication token',
      details: [],
      traceId,
    });
  }
}

module.exports = authMiddleware;
