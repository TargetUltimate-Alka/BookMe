const { Pool } = require('pg');
const config = require('../config');
const logger = require('./logger');

const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 2000,
});

let isPgAvailable = null;

pool.on('error', (err) => {
  logger.error(`Idle PostgreSQL client error: ${err.message}`);
});

async function query(text, params = []) {
  if (isPgAvailable !== false) {
    try {
      const res = await pool.query(text, params);
      isPgAvailable = true;
      return res;
    } catch (err) {
      if (
        err.code === 'ECONNREFUSED' ||
        err.code === '28P01' ||
        err.code === '3D000' ||
        err.message.includes('authentication failed') ||
        err.message.includes('Connection terminated')
      ) {
        if (isPgAvailable !== false) {
          logger.warn(
            `PostgreSQL unavailable (${err.message}). Seamlessly operating in resilient in-memory mode.`
          );
          isPgAvailable = false;
        }
      } else {
        throw err;
      }
    }
  }

  // Fallback return empty rows for DDL
  return { rows: [] };
}

module.exports = {
  pool,
  query,
  isPgActive: () => isPgAvailable === true,
};
