/**
 * Lightweight request body and params validation middleware for vendor-service.
 */
function validateBody(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Missing required field(s): ${missing.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = {
  validateBody,
};
