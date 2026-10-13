const { Pool } = require('pg');
const config = require('../config');
const inMemoryStore = require('./inMemoryStore');

const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 1500,
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

  // --- USERS ---
  if (sql.includes('FROM users') && sql.includes('phone_hash = $1')) {
    const user = await inMemoryStore.findUserByPhoneHash(params[0]);
    return { rows: user ? [user] : [] };
  }

  if (sql.includes('FROM users') && sql.includes('LOWER(email) = LOWER($1)')) {
    const user = await inMemoryStore.findUserByEmail(params[0]);
    return { rows: user ? [user] : [] };
  }

  if (sql.includes('FROM users') && sql.includes('id = $1')) {
    const user = await inMemoryStore.findUserById(params[0]);
    return { rows: user ? [user] : [] };
  }

  if (sql.includes('INSERT INTO users')) {
    // [id, name, phoneEncrypted, phoneHash, email, passwordHash, role, status]
    const user = await inMemoryStore.insertUser({
      id: params[0],
      name: params[1],
      phone_encrypted: params[2],
      phone_hash: params[3],
      email: params[4],
      password_hash: params[5],
      role: params[6],
      status: params[7] || 'ACTIVE',
    });
    return { rows: [user] };
  }

  if (sql.includes('UPDATE users') && sql.includes('failed_attempts = failed_attempts + 1')) {
    // [userId, maxAttempts, lockoutMinutes]
    const res = await inMemoryStore.incrementUserFailedAttempts(params[0], params[2], params[1]);
    return { rows: res ? [res] : [] };
  }

  if (sql.includes('UPDATE users') && sql.includes('failed_attempts = 0')) {
    await inMemoryStore.resetUserFailedAttempts(params[0]);
    return { rows: [] };
  }

  if (sql.includes('UPDATE users') && (sql.includes('name = $1') || sql.includes('email = $'))) {
    // determine params based on fields
    const updated = await inMemoryStore.updateUserProfile(params[params.length - 1], {
      name: params[0],
      email: params.length > 2 ? params[1] : undefined,
    });
    return { rows: updated ? [updated] : [] };
  }

  // --- OTP VERIFICATIONS ---
  if (sql.includes('INSERT INTO otp_verifications')) {
    // [id, phoneHash, otpHash, expiresAt, cooldownUntil]
    const otp = await inMemoryStore.insertOtp({
      id: params[0],
      phone_hash: params[1],
      otp_hash: params[2],
      expires_at: params[3],
      cooldown_until: params[4],
    });
    return { rows: [otp] };
  }

  if (sql.includes('FROM otp_verifications') && sql.includes('phone_hash = $1')) {
    const otp = await inMemoryStore.getLatestOtp(params[0]);
    return { rows: otp ? [otp] : [] };
  }

  if (sql.includes('UPDATE otp_verifications') && sql.includes('failed_attempts = failed_attempts + 1')) {
    const count = await inMemoryStore.incrementOtpFailedAttempts(params[0]);
    return { rows: [{ failed_attempts: count }] };
  }

  if (sql.includes('UPDATE otp_verifications') && sql.includes('consumed = TRUE')) {
    await inMemoryStore.markOtpConsumed(params[0]);
    return { rows: [] };
  }

  // --- VERIFICATION TOKENS ---
  if (sql.includes('INSERT INTO verification_tokens')) {
    // [token, phoneHash, expiresAt]
    const tok = await inMemoryStore.insertVerificationToken({
      token: params[0],
      phone_hash: params[1],
      expires_at: params[2],
    });
    return { rows: [tok] };
  }

  if (sql.includes('FROM verification_tokens') && sql.includes('token = $1')) {
    const tok = await inMemoryStore.findVerificationToken(params[0]);
    return { rows: tok ? [tok] : [] };
  }

  if (sql.includes('UPDATE verification_tokens') && sql.includes('consumed = TRUE')) {
    await inMemoryStore.consumeVerificationToken(params[0]);
    return { rows: [] };
  }

  // --- PHONE LOCKOUTS (FR-ONB-01) ---
  if (sql.includes('FROM phone_lockouts') && sql.includes('phone_hash = $1')) {
    const lockout = await inMemoryStore.getPhoneLockout(params[0]);
    return { rows: lockout ? [lockout] : [] };
  }

  if (sql.includes('phone_lockouts') && (sql.includes('INSERT INTO') || sql.includes('ON CONFLICT'))) {
    const lockout = await inMemoryStore.recordFailedOtpAttempt(params[0], params[2] || 15, params[1] || 5);
    return { rows: lockout ? [lockout] : [] };
  }

  if (sql.includes('UPDATE phone_lockouts') && sql.includes('failed_attempts = 0')) {
    await inMemoryStore.resetPhoneLockout(params[0]);
    return { rows: [] };
  }

  // --- REFRESH TOKENS ---
  if (sql.includes('INSERT INTO refresh_tokens')) {
    // [id, userId, tokenHash, familyId, expiresAt]
    const rec = await inMemoryStore.insertRefreshToken({
      id: params[0],
      user_id: params[1],
      token_hash: params[2],
      family_id: params[3],
      expires_at: params[4],
    });
    return { rows: [rec] };
  }

  if (sql.includes('FROM refresh_tokens') && sql.includes('token_hash = $1')) {
    const rec = await inMemoryStore.findRefreshTokenByHash(params[0]);
    return { rows: rec ? [rec] : [] };
  }

  if (sql.includes('UPDATE refresh_tokens SET revoked = TRUE') && sql.includes('token_hash = $1')) {
    await inMemoryStore.revokeRefreshTokenByHash(params[0]);
    return { rows: [] };
  }

  if (sql.includes('UPDATE refresh_tokens SET revoked = TRUE') && sql.includes('family_id = $1')) {
    await inMemoryStore.revokeTokenFamily(params[0]);
    return { rows: [] };
  }

  if (sql.includes('UPDATE refresh_tokens SET revoked = TRUE') && sql.includes('user_id = $1')) {
    await inMemoryStore.revokeAllUserTokens(params[0]);
    return { rows: [] };
  }

  // --- AGREEMENT ACCEPTANCES ---
  if (sql.includes('INSERT INTO agreement_acceptances')) {
    // [id, userId, agreementType, version, ipAddress, userAgent]
    const rec = await inMemoryStore.insertAgreementAcceptance({
      id: params[0],
      user_id: params[1],
      agreement_type: params[2],
      version: params[3],
      ip_address: params[4],
      user_agent: params[5],
    });
    return { rows: [rec] };
  }

  if (sql.includes('FROM agreement_acceptances') && sql.includes('user_id = $1') && sql.includes('agreement_type = $2')) {
    const rec = await inMemoryStore.getLatestAgreementAcceptance(params[0], params[1]);
    return { rows: rec ? [rec] : [] };
  }

  if (sql.includes('FROM agreement_acceptances') && sql.includes('user_id = $1')) {
    const list = await inMemoryStore.getAgreementAcceptances(params[0]);
    return { rows: list };
  }

  // Default empty result for DDL or unknown
  return { rows: [] };
}

module.exports = {
  pool,
  query,
  isPgActive: () => isPgAvailable === true,
};
