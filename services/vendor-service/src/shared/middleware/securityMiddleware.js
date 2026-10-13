const crypto = require('crypto');

/**
 * Security Headers (Helmet-equivalent), CORS Allow-List, Trace ID, and Sliding-Window Rate Limiter (SRS §6, §11.6).
 */

function securityHeadersMiddleware(req, res, next) {
  req.traceId = req.headers['x-request-id'] || `req_${crypto.randomBytes(6).toString('hex')}`;
  res.setHeader('X-Request-Id', req.traceId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; frame-ancestors 'none';"
  );
  next();
}

function corsMiddleware(req, res, next) {
  const allowedOriginsRaw = process.env.CORS_ALLOWED_ORIGINS || '*';
  const requestOrigin = req.headers.origin;

  if (allowedOriginsRaw === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    const allowedList = allowedOriginsRaw.split(',').map((o) => o.trim());
    if (requestOrigin && allowedList.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-Internal-Key, X-User-Id, X-User-Role'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
}

function createRateLimiter({ windowMs = 60000, max = 120, bucketName = 'default' } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }
    const now = Date.now();
    const clientKey = `${bucketName}:${req.user?.id || req.ip || 'anon'}`;
    let entry = hits.get(clientKey);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(clientKey, entry);
    }
    entry.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again shortly.',
        details: [],
        traceId: req.traceId || `req_${now}`,
      });
    }
    next();
  };
}

/**
 * Idempotency-Key replay protection middleware for mutating POST endpoints (ADR-005).
 */
const idempotencyCache = new Map();

function idempotencyMiddleware(req, res, next) {
  if (req.method !== 'POST') return next();
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  const scopedKey = `${req.user?.id || 'anon'}:${req.originalUrl}:${key}`;
  const cached = idempotencyCache.get(scopedKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('X-Idempotent-Replay', 'true');
    return res.status(cached.statusCode).json(cached.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyCache.set(scopedKey, {
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }
    return originalJson(body);
  };

  next();
}

module.exports = {
  securityHeadersMiddleware,
  securityHeaders: securityHeadersMiddleware,
  corsMiddleware,
  createRateLimiter,
  rateLimitMiddleware: createRateLimiter,
  idempotencyMiddleware,
};

