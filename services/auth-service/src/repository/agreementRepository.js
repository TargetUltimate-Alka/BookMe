const crypto = require('crypto');
const { query } = require('../db/pool');

class AgreementRepository {
  async recordAcceptance({ userId, agreementType, version, ipAddress, userAgent }) {
    const id = `agr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const text = `
      INSERT INTO agreement_acceptances (id, user_id, agreement_type, version, ip_address, user_agent, accepted_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, user_id, agreement_type, version, ip_address, accepted_at;
    `;
    const res = await query(text, [id, userId, agreementType, version, ipAddress, userAgent || null]);
    return res.rows[0];
  }

  async getAcceptancesByUser(userId) {
    const text = `
      SELECT id, user_id, agreement_type, version, ip_address, accepted_at
      FROM agreement_acceptances
      WHERE user_id = $1
      ORDER BY accepted_at DESC;
    `;
    const res = await query(text, [userId]);
    return res.rows || [];
  }

  async getLatestAcceptance(userId, agreementType) {
    const text = `
      SELECT id, user_id, agreement_type, version, ip_address, accepted_at
      FROM agreement_acceptances
      WHERE user_id = $1 AND agreement_type = $2
      ORDER BY accepted_at DESC
      LIMIT 1;
    `;
    const res = await query(text, [userId, agreementType]);
    return res.rows[0] || null;
  }
}

module.exports = new AgreementRepository();
