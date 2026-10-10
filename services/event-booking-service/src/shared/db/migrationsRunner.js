const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const logger = require('../logger');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read all .sql files in migrations directory
    const migrationsDir = path.resolve(__dirname, '../../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`Migrations directory not found at: ${migrationsDir}`);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // 3. Query already applied migrations
    const res = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(res.rows.map((row) => row.version));

    // 4. Apply new migrations in order
    for (const file of files) {
      if (!applied.has(file)) {
        logger.info(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
          await client.query('COMMIT');
          logger.info(`Successfully applied migration: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error(`Migration failed on ${file}: ${err.message}`);
          throw err;
        }
      }
    }
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
