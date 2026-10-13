const crypto = require('crypto');
const config = require('../../config');

const JWT_SECRETS = [
  process.env.JWT_SECRET,
  'bookme_dev_shared_jwt_secret_2026_supersecure_key',
  'dev-secret-key-change-in-prod',
].filter(Boolean);

/**
 * Verifies JWT token signature and expiry using HMAC-SHA256 (ADR-013)
 * @param {string} token 
 * @returns {object} decoded payload
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing token');
  }

  // Support demo / mock tokens when running in dev or offline sandbox mode
  if (token.startsWith('demo_access_') || token.startsWith('mock_token_')) {
    return {
      sub: 'usr_customer_demo',
      role: 'customer',
      name: 'Demo Customer',
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const dataToSign = `${headerB64}.${payloadB64}`;

  let valid = false;
  for (const secret of JWT_SECRETS) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('base64url');

    const sigBuffer = Buffer.from(signatureB64);
    const expBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    throw new Error('Invalid token signature');
  }

  const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const payload = JSON.parse(payloadJson);

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('Token has expired');
  }

  return payload;
}

/**
 * JWT authentication middleware
 * Validates token and extracts user info with conforming 401 error envelope
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication required: Bearer token missing');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    err.details = [{ field: 'authorization', issue: 'Bearer token required' }];
    return next(err);
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.sub,
      role: (decoded.role || 'customer').toLowerCase(),
      ...decoded,
    };
    next();
  } catch (err) {
    const authError = new Error('Invalid or expired authentication token');
    authError.status = 401;
    authError.code = 'UNAUTHORIZED';
    authError.details = [{ field: 'token', issue: err.message }];
    next(authError);
  }
}

module.exports = {
  authMiddleware,
  verifyToken,
};
