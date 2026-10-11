const { query } = require('../db/pool');

class UserRepository {
  async createUser({ id, name, email, passwordHash, role }) {
    const text = `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, created_at, updated_at;
    `;
    const values = [id, name, email.trim().toLowerCase(), passwordHash, role];
    const res = await query(text, values);
    return res.rows[0];
  }

  async findByEmail(email) {
    const text = `
      SELECT id, name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const res = await query(text, [email.trim()]);
    return res.rows[0] || null;
  }

  async findById(id) {
    const text = `
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  }

  async updateName(id, newName) {
    const text = `
      UPDATE users
      SET name = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, created_at, updated_at;
    `;
    const res = await query(text, [newName.trim(), id]);
    return res.rows[0] || null;
  }
}

module.exports = new UserRepository();
