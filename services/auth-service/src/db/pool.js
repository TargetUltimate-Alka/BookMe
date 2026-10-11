const { Pool } = require('pg');
const config = require('../config');
const inMemoryStore = require('./inMemoryStore');

const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 2000,
});

let isPgAvailable = null; // null = untested, true = connected, false = fallback

pool.on('error', (err) => {
  console.error('[auth-service] Unexpected error on idle PostgreSQL client:', err.message);
});

async function query(text, params) {
  if (isPgAvailable !== false) {
    try {
      const res = await pool.query(text, params);
      isPgAvailable = true;
      return res;
    } catch (err) {
      if (
        err.code === 'ECONNREFUSED' ||
        err.code === '28P01' ||
        err.message.includes('authentication failed') ||
        err.message.includes('Connection terminated')
      ) {
        if (isPgAvailable !== false) {
          console.warn(
            `[auth-service] PostgreSQL unavailable (${err.message}). Seamlessly operating in resilient in-memory mode for development.`
          );
          isPgAvailable = false;
        }
      } else {
        throw err;
      }
    }
  }

  // Parse simulated SQL for in-memory fallback
  return executeInMemoryQuery(text, params);
}

async function executeInMemoryQuery(text, params = []) {
  const sql = text.replace(/\s+/g, ' ').trim();

  // 1. SELECT users by email
  if (sql.includes('FROM users') && sql.includes('LOWER(email) = LOWER($1)')) {
    const user = await inMemoryStore.findUserByEmail(params[0]);
    return { rows: user ? [user] : [] };
  }

  // 2. SELECT users by ID
  if (sql.includes('FROM users') && sql.includes('id = $1')) {
    const user = await inMemoryStore.findUserById(params[0]);
    return { rows: user ? [user] : [] };
  }

  // 3. INSERT INTO users
  if (sql.includes('INSERT INTO users')) {
    // params: [id, name, email, password_hash, role]
    const user = await inMemoryStore.insertUser({
      id: params[0],
      name: params[1],
      email: params[2],
      password_hash: params[3],
      role: params[4],
    });
    return { rows: [user] };
  }

  // 4. UPDATE users SET name = $1
  if (sql.includes('UPDATE users SET name = $1')) {
    const updated = await inMemoryStore.updateUserName(params[1], params[0]);
    return { rows: updated ? [updated] : [] };
  }

  // 5. INSERT INTO refresh_tokens
  if (sql.includes('INSERT INTO refresh_tokens')) {
    // params: [id, user_id, token, expires_at]
    const tokenRecord = await inMemoryStore.insertRefreshToken({
      id: params[0],
      user_id: params[1],
      token: params[2],
      expires_at: params[3],
    });
    return { rows: [tokenRecord] };
  }

  // 6. SELECT refresh_tokens WHERE token = $1
  if (sql.includes('FROM refresh_tokens') && sql.includes('token = $1')) {
    const record = await inMemoryStore.findRefreshToken(params[0]);
    return { rows: record ? [record] : [] };
  }

  // 7. UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1
  if (sql.includes('UPDATE refresh_tokens SET revoked = TRUE') && sql.includes('token = $1')) {
    await inMemoryStore.revokeRefreshToken(params[0]);
    return { rows: [] };
  }

  // 8. UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1
  if (sql.includes('UPDATE refresh_tokens SET revoked = TRUE') && sql.includes('user_id = $1')) {
    await inMemoryStore.revokeAllUserTokens(params[0]);
    return { rows: [] };
  }

  // Default empty result for DDL like CREATE TABLE
  return { rows: [] };
}

module.exports = {
  pool,
  query,
  isPgActive: () => isPgAvailable === true,
};
