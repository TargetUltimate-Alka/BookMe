function validate(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push({ field, issue: `${field} is required` });
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: missing,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
        },
      });
    }

    next();
  };
}

module.exports = { validate };
