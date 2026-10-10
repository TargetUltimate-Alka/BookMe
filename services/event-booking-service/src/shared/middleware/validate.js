const Ajv = require('ajv');

let ajv;
try {
  const addFormats = require('ajv-formats');
  ajv = new Ajv({ allErrors: true, removeAdditional: false });
  addFormats(ajv);
} catch (e) {
  ajv = new Ajv({ allErrors: true, removeAdditional: false });
  // Fallback format for 'date'
  ajv.addFormat('date', {
    type: 'string',
    validate: (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)),
  });
}

/**
 * Creates request validation middleware for a given AJV schema
 * @param {object} schema - JSON schema
 * @param {'body'|'query'|'params'} source - request property to validate
 */
function validate(schema, source = 'body') {
  const compiled = ajv.compile(schema);

  return (req, res, next) => {
    const valid = compiled(req[source]);
    if (!valid) {
      const details = (compiled.errors || []).map((err) => ({
        field: err.instancePath ? err.instancePath.replace(/^\//, '') : (err.params?.missingProperty || 'root'),
        issue: err.message,
        rule: err.keyword,
      }));

      const error = new Error('Validation failed');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = details;
      return next(error);
    }
    next();
  };
}

module.exports = { validate, ajv };
