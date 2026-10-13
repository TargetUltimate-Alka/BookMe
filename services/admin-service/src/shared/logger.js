const logger = {
  info: (msg, meta) => console.log(`[INFO] [admin-service] ${msg}`, meta ? meta : ''),
  warn: (msg, meta) => console.warn(`[WARN] [admin-service] ${msg}`, meta ? meta : ''),
  error: (msg, meta) => console.error(`[ERROR] [admin-service] ${msg}`, meta ? meta : ''),
};

module.exports = logger;
