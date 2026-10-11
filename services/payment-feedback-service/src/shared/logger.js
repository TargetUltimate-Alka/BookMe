const logger = {
  info: (msg, meta) => console.log(`[INFO] [payment-feedback-service] ${msg}`, meta ? meta : ''),
  warn: (msg, meta) => console.warn(`[WARN] [payment-feedback-service] ${msg}`, meta ? meta : ''),
  error: (msg, meta) => console.error(`[ERROR] [payment-feedback-service] ${msg}`, meta ? meta : ''),
  debug: (msg, meta) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] [payment-feedback-service] ${msg}`, meta ? meta : '');
    }
  },
};

module.exports = logger;
