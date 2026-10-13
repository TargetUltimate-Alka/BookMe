const fs = require('fs');
const path = require('path');
const { query } = require('./pool');

async function runMigration(direction = 'up') {
  const filename = direction === 'down' ? '001_auth_schema_down.sql' : '001_auth_schema.sql';
  const filePath = path.join(__dirname, 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`[auth-service] Running migration ${direction.toUpperCase()}: ${filename}`);
  await query(sql);
  console.log(`[auth-service] Migration ${direction.toUpperCase()} completed successfully.`);
}

if (require.main === module) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  runMigration(direction)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[auth-service] Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
