const { Pool } = require('pg');
const config = require('../../config');
const logger = require('../logger');
const inMemoryStore = require('./inMemoryStore');

const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 2000,
});

let isPgAvailable = null;

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

async function query(text, params) {
  if (isPgAvailable !== false) {
    try {
      const res = await pool.query(text, params);
      isPgAvailable = true;
      return res;
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.message.includes('authentication failed')) {
        if (isPgAvailable !== false) {
          logger.warn(
            `PostgreSQL unavailable (${err.message}). Seamlessly operating in resilient in-memory mode for development.`
          );
          isPgAvailable = false;
        }
      } else {
        throw err;
      }
    }
  }

  return inMemoryStore.executeQuery(text, params);
}

async function getClient() {
  if (isPgAvailable !== false) {
    try {
      const client = await pool.connect();
      isPgAvailable = true;
      return client;
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.message.includes('authentication failed')) {
        if (isPgAvailable !== false) {
          logger.warn(
            `PostgreSQL unavailable (${err.message}). Using in-memory client wrapper for development transactions.`
          );
          isPgAvailable = false;
        }
      } else {
        throw err;
      }
    }
  }

  // Fallback in-memory client
  return {
    query: (text, params) => inMemoryStore.executeQuery(text, params),
    release: () => {},
  };
}

module.exports = {
  pool,
  query,
  getClient,
};
