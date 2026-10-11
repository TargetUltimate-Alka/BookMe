/**
 * Simple structured logger supporting request-id tracing
 */
const logger = {
  info: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    const reqId = meta.requestId ? `[req:${meta.requestId}] ` : '';
    console.log(`${timestamp} INFO: ${reqId}${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    const reqId = meta.requestId ? `[req:${meta.requestId}] ` : '';
    console.warn(`${timestamp} WARN: ${reqId}${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    const reqId = meta.requestId ? `[req:${meta.requestId}] ` : '';
    console.error(`${timestamp} ERROR: ${reqId}${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      const reqId = meta.requestId ? `[req:${meta.requestId}] ` : '';
      console.debug(`${timestamp} DEBUG: ${reqId}${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  },
};

module.exports = logger;
