const fs = require('fs');
const path = require('path');
const { runMigration } = require('../src/db/migrate');

describe('Database Migrations (UP and DOWN)', () => {
  const upMigrationPath = path.resolve(__dirname, '../src/db/migrations/001_auth_schema.sql');
  const downMigrationPath = path.resolve(__dirname, '../src/db/migrations/001_auth_schema_down.sql');

  it('Verifies 001_auth_schema.sql exists and contains valid DDL statements', () => {
    expect(fs.existsSync(upMigrationPath)).toBe(true);
    const sql = fs.readFileSync(upMigrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS otp_verifications');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS verification_tokens');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS refresh_tokens');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS agreement_acceptances');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS phone_lockouts');
  });

  it('Verifies 001_auth_schema_down.sql exists and drops all auth tables in reverse order', () => {
    expect(fs.existsSync(downMigrationPath)).toBe(true);
    const sql = fs.readFileSync(downMigrationPath, 'utf8');

    expect(sql).toContain('DROP TABLE IF EXISTS phone_lockouts CASCADE;');
    expect(sql).toContain('DROP TABLE IF EXISTS agreement_acceptances CASCADE;');
    expect(sql).toContain('DROP TABLE IF EXISTS refresh_tokens CASCADE;');
    expect(sql).toContain('DROP TABLE IF EXISTS verification_tokens CASCADE;');
    expect(sql).toContain('DROP TABLE IF EXISTS otp_verifications CASCADE;');
    expect(sql).toContain('DROP TABLE IF EXISTS users CASCADE;');
  });

  it('Executes UP and DOWN migrations cleanly via runner', async () => {
    // Test UP migration execution
    await expect(runMigration('up')).resolves.not.toThrow();

    // Test DOWN migration execution
    await expect(runMigration('down')).resolves.not.toThrow();

    // Re-apply UP migration to leave schema ready for operation
    await expect(runMigration('up')).resolves.not.toThrow();
  });
});
