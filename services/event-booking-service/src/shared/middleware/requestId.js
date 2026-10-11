const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  const reqId = req.header('X-Request-Id') || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

module.exports = requestIdMiddleware;
