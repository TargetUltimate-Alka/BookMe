const { query } = require('../db/pool');
const logger = require('../logger');

/**
 * Idempotency middleware for mutating endpoints (ADR-005)
 * @param {boolean} required - whether missing Idempotency-Key header causes 400 rejection
 */
function idempotencyMiddleware(required = false) {
  return async (req, res, next) => {
    const key = req.header('Idempotency-Key');

    if (!key) {
      if (required) {
        const err = new Error('Idempotency-Key header is required for this operation');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        err.details = [{ field: 'Idempotency-Key', issue: 'Header missing' }];
        return next(err);
      }
      return next();
    }

    try {
      // 1. Check if cached response exists
      const checkRes = await query(
        'SELECT response_status, response_body FROM idempotency_keys WHERE idempotency_key = $1',
        [key]
      );

      if (checkRes && checkRes.rows && checkRes.rows.length > 0) {
        const cached = checkRes.rows[0];
        logger.info(`Returning cached idempotent response for key: ${key}`);
        res.setHeader('X-Cache-Lookup', 'HIT');
        const body = typeof cached.response_body === 'string'
          ? JSON.parse(cached.response_body)
          : cached.response_body;
        return res.status(cached.response_status).json(body);
      }

      // 2. Intercept response to store result
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode < 500) {
          query(
            'INSERT INTO idempotency_keys (idempotency_key, request_path, response_status, response_body) VALUES ($1, $2, $3, $4) ON CONFLICT (idempotency_key) DO NOTHING',
            [key, req.path, res.statusCode, JSON.stringify(body)]
          ).catch((err) => {
            logger.error(`Failed to cache idempotency key ${key}: ${err.message}`);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.error(`Idempotency check failed: ${err.message}`);
      next();
    }
  };
}

module.exports = idempotencyMiddleware;
