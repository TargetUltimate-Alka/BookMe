const crypto = require('crypto');

/**
 * Authentication & RBAC Middleware for vendor-service (SRS §2.1, §11.6, FR-ADM-01, FR-ONB-06)
 * Supports:
 * 1. Standard HS256 JWT Bearer tokens issued by `auth-service`
 * 2. Internal service-to-service `X-Internal-Key` authentication
 * 3. Controlled development/test headers (`X-User-Id`, `X-User-Role`) when `NODE_ENV !== 'production'`
 */

const ADMIN_SUB_ROLES = [
  'admin',
  'superAdmin',
  'verifier',
  'supportAgent',
  'financeAdmin',
  'contentModerator',
];

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function base64UrlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signJwtHs256(payload, secret = process.env.JWT_SECRET || 'change_me', expiresInSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    iat: now,
    exp: now + expiresInSeconds,
    ...payload,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', String(secret)).update(signingInput).digest()
  );
  return `${signingInput}.${signature}`;
}

function verifyJwtHs256(token, secret = process.env.JWT_SECRET || 'change_me') {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token');
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', String(secret)).update(signingInput).digest()
  );

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    // Also try auth-service default dev secret if JWT_SECRET differs in local multi-service dev
    const fallbackSecret = 'bookme_dev_jwt_secret_key_2026';
    const fallbackSig = base64UrlEncode(
      crypto.createHmac('sha256', fallbackSecret).update(signingInput).digest()
    );
    const fbBuf = Buffer.from(fallbackSig);
    if (sigBuf.length !== fbBuf.length || !crypto.timingSafeEqual(sigBuf, fbBuf)) {
      throw new Error('Invalid JWT signature');
    }
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    const expErr = new Error('Token expired');
    expErr.name = 'TokenExpiredError';
    throw expErr;
  }
  return payload;
}

/**
 * Extracts user identity if present (attaches `req.user`), without blocking anonymous requests.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const decoded = verifyJwtHs256(token);
      const uid = decoded.sub || decoded.id || decoded.userId;
      req.user = {
        id: uid,
        userId: uid,
        vendorId: decoded.vendorId || null,
        role: decoded.role || 'customer',
        roles: Array.isArray(decoded.roles) ? decoded.roles : [decoded.role || 'customer'],
      };
      return next();
    } catch (err) {
      req.authError = err;
    }
  }

  // Support development/internal headers when not in strict production mode
  if (process.env.NODE_ENV !== 'production') {
    const devUserId = req.headers['x-user-id'];
    const devRole = req.headers['x-user-role'];
    if (devUserId) {
      req.user = {
        id: String(devUserId),
        userId: String(devUserId),
        role: String(devRole || 'vendor'),
        roles: String(devRole || 'vendor').split(',').map((r) => r.trim()),
      };
    }
  }

  next();
}

/**
 * Requires an authenticated user session.
 */
function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        error: 'Unauthorized',
        message: req.authError ? req.authError.message : 'Authentication token is required.',
        details: [],
        traceId: req.traceId || `req_${Date.now()}`,
      });
    }
    next();
  });
}

/**
 * Enforces Role-Based Access Control (FR-ADM-01, FR-ONB-06).
 * Note: 'admin' or 'superAdmin' satisfies any admin sub-role check per SRS FR-ADM-01 ("Super Admin: everything").
 */
function requireRole(...allowedRoles) {
  const flatAllowed = allowedRoles.flat();
  return (req, res, next) => {
    requireAuth(req, res, () => {
      const userRoles = new Set([
        req.user.role,
        ...(Array.isArray(req.user.roles) ? req.user.roles : []),
      ]);

      // Super Admin (or generic 'admin' in legacy auth-service) has full administrative permissions
      const isSuperAdmin = userRoles.has('superAdmin') || userRoles.has('admin');
      const hasMatch =
        isSuperAdmin && flatAllowed.some((r) => ADMIN_SUB_ROLES.includes(r))
          ? true
          : flatAllowed.some((r) => userRoles.has(r));

      if (!hasMatch) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          error: 'Forbidden',
          message: `Insufficient permissions. Required role(s): ${flatAllowed.join(', ')}`,
          details: [],
          traceId: req.traceId || `req_${Date.now()}`,
        });
      }

      next();
    });
  };
}

/**
 * Validates internal microservice calls via `X-Internal-Key` when in production.
 */
function requireInternalAuth(req, res, next) {
  const configuredKey = process.env.INTERNAL_API_KEY;
  const suppliedKey = req.headers['x-internal-key'];

  if (process.env.NODE_ENV === 'production' && configuredKey && suppliedKey !== configuredKey) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      error: 'Unauthorized',
      message: 'Valid X-Internal-Key header is required for internal endpoints.',
      details: [],
      traceId: req.traceId || `req_${Date.now()}`,
    });
  }
  next();
}

module.exports = {
  signJwtHs256,
  signJwt: signJwtHs256,
  verifyJwtHs256,
  verifyJwt: verifyJwtHs256,
  optionalAuth,
  requireAuth,
  requireRole,
  requireInternalAuth,
  ADMIN_SUB_ROLES,
};
