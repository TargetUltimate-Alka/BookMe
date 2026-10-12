const { query } = require('../db/pool');

class UserRepository {
  async createUser({ id, name, phoneEncrypted, phoneHash, email, passwordHash, role, status = 'ACTIVE' }) {
    const text = `
      INSERT INTO users (id, name, phone_encrypted, phone_hash, email, password_hash, role, status, failed_attempts)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
      RETURNING id, name, phone_encrypted, phone_hash, email, role, status, created_at, updated_at;
    `;
    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    const values = [id, name, phoneEncrypted, phoneHash, normalizedEmail, passwordHash, role, status];
    const res = await query(text, values);
    return res.rows[0];
  }

  async findByPhoneHash(phoneHash) {
    const text = `
      SELECT id, name, phone_encrypted, phone_hash, email, password_hash, role, status, failed_attempts, locked_until, created_at, updated_at
      FROM users
      WHERE phone_hash = $1;
    `;
    const res = await query(text, [phoneHash]);
    return res.rows[0] || null;
  }

  async findByEmail(email) {
    if (!email) return null;
    const text = `
      SELECT id, name, phone_encrypted, phone_hash, email, password_hash, role, status, failed_attempts, locked_until, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const res = await query(text, [email.trim()]);
    return res.rows[0] || null;
  }

  async findById(id) {
    const text = `
      SELECT id, name, phone_encrypted, phone_hash, email, role, status, failed_attempts, locked_until, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  }

  async updateProfile(id, { name, email }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(email ? email.trim().toLowerCase() : null);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const text = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, email, role, created_at, updated_at;
    `;
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  async updateName(id, newName) {
    return this.updateProfile(id, { name: newName });
  }

  async incrementFailedAttempts(userId, lockoutMinutes = 15, maxAttempts = 5) {
    const text = `
      UPDATE users
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE
            WHEN failed_attempts + 1 >= $2 THEN CURRENT_TIMESTAMP + ($3 || ' minutes')::INTERVAL
            ELSE locked_until
          END,
          status = CASE
            WHEN failed_attempts + 1 >= $2 THEN 'LOCKED'
            ELSE status
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING failed_attempts, locked_until, status;
    `;
    const res = await query(text, [userId, maxAttempts, lockoutMinutes]);
    return res.rows[0];
  }

  async resetFailedAttempts(userId) {
    const text = `
      UPDATE users
      SET failed_attempts = 0,
          locked_until = NULL,
          status = 'ACTIVE',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    await query(text, [userId]);
    return true;
  }
}

module.exports = new UserRepository();
