const { Pool } = require('pg');
const inMemoryStore = require('./inMemoryStore');

const connectionString =
  process.env.DATABASE_URL || 'postgres://user:password@localhost:5434/vendor_db';

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 400,
});

let isPgAvailable = null; // null = untested, true = connected, false = fallback

pool.on('error', (err) => {
  console.warn('[vendor-service] Idle PostgreSQL client error:', err.message);
});

async function query(text, params = []) {
  if (isPgAvailable !== false && process.env.FORCE_IN_MEMORY_DB !== 'true') {
    try {
      const res = await pool.query(text, params);
      isPgAvailable = true;
      return res;
    } catch (err) {
      const isConnectionErr =
        err.code === 'ECONNREFUSED' ||
        err.code === 'ENOTFOUND' ||
        err.code === '28P01' ||
        err.code === '3D000' ||
        (err.message &&
          (err.message.includes('ECONNREFUSED') ||
            err.message.includes('connect') ||
            err.message.includes('timeout') ||
            err.message.includes('authentication failed') ||
            err.message.includes('Connection terminated') ||
            err.message.includes('getaddrinfo')));

      if (isConnectionErr) {
        if (isPgAvailable !== false) {
          console.warn(
            `[vendor-service] PostgreSQL unreachable (${err.message || err.code}). Operating in resilient in-memory mode.`
          );
          isPgAvailable = false;
        }
      } else {
        throw err;
      }
    }
  } else {
    isPgAvailable = false;
  }

  return inMemoryStore.executeSql(text, params);
}

async function getClient() {
  if (isPgAvailable !== false && process.env.FORCE_IN_MEMORY_DB !== 'true') {
    try {
      const client = await pool.connect();
      isPgAvailable = true;
      return client;
    } catch (err) {
      if (isPgAvailable !== false) {
        console.warn(
          `[vendor-service] PostgreSQL client connect failed (${err.message || err.code}). Using in-memory client adapter.`
        );
        isPgAvailable = false;
      }
    }
  } else {
    isPgAvailable = false;
  }

  return {
    query: (text, params) => inMemoryStore.executeSql(text, params),
    release: () => {},
  };
}

async function withTransaction(fn) {
  const client = await getClient();
  try {
    if (isPgAvailable === true) {
      await client.query('BEGIN');
    }
    const result = await fn(client);
    if (isPgAvailable === true) {
      await client.query('COMMIT');
    }
    return result;
  } catch (err) {
    if (isPgAvailable === true) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
}

const originalPoolConnect = pool.connect.bind(pool);
pool.connect = async function wrappedConnect(...args) {
  if (args.length > 0) {
    return originalPoolConnect(...args);
  }
  return getClient();
};

module.exports = {
  query,
  getClient,
  withTransaction,
  pool,
  inMemoryStore,
  isPgActive: () => isPgAvailable === true,
};
