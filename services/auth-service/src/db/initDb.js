const { runMigration } = require('./migrate');

async function initDb() {
  try {
    await runMigration('up');
    console.log('[auth-service] Database schema initialization completed.');
  } catch (err) {
    console.warn('[auth-service] DB schema init notice:', err.message);
  }
}

module.exports = initDb;
