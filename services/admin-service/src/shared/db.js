const { Pool } = require('pg');
const config = require('../config');
const logger = require('./logger');
const store = require('./inMemoryStore');

let pool = null;
let isPgActive = false;

if (config.databaseUrl) {
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 1500,
    });
  } catch {
    pool = null;
  }
}

async function initDb() {
  if (!pool) {
    logger.warn('PostgreSQL pool not configured. Running in resilient in-memory mode.');
    isPgActive = false;
    return;
  }

  try {
    const client = await pool.connect();
    // Create tables if postgres is active
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_configs (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_by VARCHAR(100),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_config_history (
        id VARCHAR(100) PRIMARY KEY,
        key VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT NOT NULL,
        change_reason TEXT,
        updated_by VARCHAR(100),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        actor_id VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        before_state JSONB,
        after_state JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_vendor_enforcements (
        id VARCHAR(100) PRIMARY KEY,
        vendor_id VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        case_notes TEXT,
        applied_by VARCHAR(100),
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    client.release();
    isPgActive = true;
    logger.info('Connected to PostgreSQL successfully and verified admin schema.');
  } catch (err) {
    isPgActive = false;
    logger.warn(`PostgreSQL unavailable (${err.message}). Seamlessly running in resilient in-memory mode.`);
  }
}

module.exports = {
  initDb,
  isPgActive: () => isPgActive,
  store,
};
