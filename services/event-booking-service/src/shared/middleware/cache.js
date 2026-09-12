/**
 * Cache-Control and ETag middleware
 * Status: Implements "Deliberate Cache-Control on every GET" and "ETag and working 304 response" requirements
 */

const crypto = require('crypto');

/**
 * Set Cache-Control header for GET responses
 * cacheConfig: { maxAge, isImmutable, isPrivate }
 */
const setCacheControl = (cacheConfig = {}) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      const { maxAge = 60, isImmutable = false, isPrivate = false } = cacheConfig;
      const scope = isPrivate ? 'private' : 'public';
      const immutable = isImmutable ? ', immutable' : '';
      const revalidate = !isImmutable ? ', must-revalidate' : '';

      res.set(
        'Cache-Control',
        `${scope}, max-age=${maxAge}${immutable}${revalidate}`
      );
    }
    next();
  };
};

/**
 * Generate and send ETag, handle 304 Not Modified
 */
const handleETag = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  // Override json to add ETag
  res.json = function (body) {
    if (req.method === 'GET' && body && typeof body === 'object') {
      const etag = generateETag(JSON.stringify(body));
      res.set('ETag', etag);

      // Check If-None-Match header
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
    }

    return originalJson.call(this, body);
  };

  next();
};

const generateETag = (data) => {
  return `"${crypto.createHash('md5').update(data).digest('hex')}"`;
};

module.exports = {
  setCacheControl,
  handleETag,
  generateETag,
};
