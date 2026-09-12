/**
 * JWT authentication middleware
 * Validates token and extracts user info
 * Status: Supports proper HTTP 401 responses for unauthorized requests
 */

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid authorization header');
    err.status = 401;
    err.details = [{ field: 'authorization', issue: 'Bearer token required' }];
    return next(err);
  }

  const token = authHeader.substring(7);

  // In a real implementation, verify JWT signature here
  // For now, basic validation: extract sub and role from decoded token
  try {
    // TODO: Implement real JWT verification with jwt library and JWT_SECRET
    // This is a placeholder - each request will have the user info extracted
    // from the Bearer token in a real implementation

    // For now, we'll trust the token is valid (in production, verify signature)
    const decoded = decodeToken(token);
    req.user = decoded;
    req.user.id = decoded.sub;
    next();
  } catch (err) {
    const authError = new Error('Invalid or expired token');
    authError.status = 401;
    authError.details = [{ field: 'token', issue: 'Token verification failed' }];
    next(authError);
  }
};

// Helper to decode JWT (without verification for now)
// In production, use: const jwt = require('jsonwebtoken'); jwt.verify(token, JWT_SECRET)
const decodeToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (err) {
    throw new Error('Token decode failed');
  }
};

module.exports = { authMiddleware };
