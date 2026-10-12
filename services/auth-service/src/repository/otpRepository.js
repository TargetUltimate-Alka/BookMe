const crypto = require('crypto');
const { query } = require('../db/pool');

class OtpRepository {
  async saveOtp({ phoneHash, otpHash, expiresAt, cooldownUntil }) {
    const id = `otp_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const text = `
      INSERT INTO otp_verifications (id, phone_hash, otp_hash, expires_at, cooldown_until, consumed, failed_attempts)
      VALUES ($1, $2, $3, $4, $5, FALSE, 0)
      RETURNING id, phone_hash, expires_at, cooldown_until;
    `;
    const res = await query(text, [id, phoneHash, otpHash, expiresAt, cooldownUntil]);
    return res.rows[0];
  }

  async getLatestActiveOtp(phoneHash) {
    const text = `
      SELECT id, phone_hash, otp_hash, expires_at, cooldown_until, consumed, failed_attempts
      FROM otp_verifications
      WHERE phone_hash = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const res = await query(text, [phoneHash]);
    return res.rows[0] || null;
  }

  async incrementFailedAttempts(otpId) {
    const text = `
      UPDATE otp_verifications
      SET failed_attempts = failed_attempts + 1
      WHERE id = $1
      RETURNING failed_attempts;
    `;
    const res = await query(text, [otpId]);
    return res.rows[0]?.failed_attempts || 1;
  }

  async markConsumed(otpId) {
    const text = `
      UPDATE otp_verifications
      SET consumed = TRUE
      WHERE id = $1;
    `;
    await query(text, [otpId]);
    return true;
  }

  async createVerificationToken({ phoneHash, expiresAt }) {
    const token = `tok_otp_verified_${crypto.randomBytes(16).toString('hex')}`;
    const text = `
      INSERT INTO verification_tokens (token, phone_hash, expires_at, consumed)
      VALUES ($1, $2, $3, FALSE)
      RETURNING token, phone_hash, expires_at;
    `;
    const res = await query(text, [token, phoneHash, expiresAt]);
    return res.rows[0]?.token || token;
  }

  async findVerificationToken(token) {
    const text = `
      SELECT token, phone_hash, expires_at, consumed
      FROM verification_tokens
      WHERE token = $1;
    `;
    const res = await query(text, [token]);
    return res.rows[0] || null;
  }

  async consumeVerificationToken(token) {
    const text = `
      UPDATE verification_tokens
      SET consumed = TRUE
      WHERE token = $1;
    `;
    await query(text, [token]);
    return true;
  }

  // --- Phone-level Lockout tracking per FR-ONB-01 ---
  async getPhoneLockout(phoneHash) {
    const text = `
      SELECT phone_hash, failed_attempts, locked_until
      FROM phone_lockouts
      WHERE phone_hash = $1;
    `;
    const res = await query(text, [phoneHash]);
    return res.rows[0] || null;
  }

  async recordFailedOtpAttempt(phoneHash, lockoutMinutes = 15, maxAttempts = 5) {
    const text = `
      INSERT INTO phone_lockouts (phone_hash, failed_attempts, locked_until, updated_at)
      VALUES ($1, 1, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT (phone_hash) DO UPDATE
      SET failed_attempts = phone_lockouts.failed_attempts + 1,
          locked_until = CASE
            WHEN phone_lockouts.failed_attempts + 1 >= $2 THEN CURRENT_TIMESTAMP + ($3 || ' minutes')::INTERVAL
            ELSE phone_lockouts.locked_until
          END,
          updated_at = CURRENT_TIMESTAMP
      RETURNING phone_hash, failed_attempts, locked_until;
    `;
    const res = await query(text, [phoneHash, maxAttempts, lockoutMinutes]);
    return res.rows[0] || null;
  }

  async resetPhoneLockout(phoneHash) {
    const text = `
      UPDATE phone_lockouts
      SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE phone_hash = $1;
    `;
    await query(text, [phoneHash]);
    return true;
  }
}

module.exports = new OtpRepository();
