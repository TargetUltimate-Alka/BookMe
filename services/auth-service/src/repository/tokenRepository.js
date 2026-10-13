const { query } = require('../db/pool');

class TokenRepository {
  async createRefreshToken({ id, userId, tokenHash, familyId, expiresAt }) {
    const text = `
      INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, revoked)
      VALUES ($1, $2, $3, $4, $5, FALSE)
      RETURNING id, user_id, token_hash, family_id, expires_at, revoked, created_at;
    `;
    const values = [id, userId, tokenHash, familyId, expiresAt];
    const res = await query(text, values);
    return res.rows[0];
  }

  async findRefreshTokenByHash(tokenHash) {
    const text = `
      SELECT id, user_id, token_hash, family_id, expires_at, revoked, created_at
      FROM refresh_tokens
      WHERE token_hash = $1;
    `;
    const res = await query(text, [tokenHash]);
    return res.rows[0] || null;
  }

  async revokeRefreshTokenByHash(tokenHash) {
    const text = `
      UPDATE refresh_tokens
      SET revoked = TRUE
      WHERE token_hash = $1;
    `;
    await query(text, [tokenHash]);
    return true;
  }

  async revokeTokenFamily(familyId) {
    const text = `
      UPDATE refresh_tokens
      SET revoked = TRUE
      WHERE family_id = $1;
    `;
    await query(text, [familyId]);
    return true;
  }

  async revokeAllUserTokens(userId) {
    const text = `
      UPDATE refresh_tokens
      SET revoked = TRUE
      WHERE user_id = $1;
    `;
    await query(text, [userId]);
    return true;
  }
}

module.exports = new TokenRepository();
