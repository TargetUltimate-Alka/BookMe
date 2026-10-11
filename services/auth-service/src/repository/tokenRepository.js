const { query } = require('../db/pool');

class TokenRepository {
  async createRefreshToken({ id, userId, token, expiresAt }) {
    const text = `
      INSERT INTO refresh_tokens (id, user_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, token, expires_at, revoked, created_at;
    `;
    const values = [id, userId, token, expiresAt];
    const res = await query(text, values);
    return res.rows[0];
  }

  async findRefreshToken(token) {
    const text = `
      SELECT id, user_id, token, expires_at, revoked, created_at
      FROM refresh_tokens
      WHERE token = $1;
    `;
    const res = await query(text, [token]);
    return res.rows[0] || null;
  }

  async revokeRefreshToken(token) {
    const text = `
      UPDATE refresh_tokens
      SET revoked = TRUE
      WHERE token = $1;
    `;
    await query(text, [token]);
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
