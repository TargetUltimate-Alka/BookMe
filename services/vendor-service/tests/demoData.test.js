const { Pool } = require('pg');
const assert = require('assert');

// Simple test suite
async function runTests() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Running tests...');

    // 1. Uniqueness check for vendors
    const { rows: vendorRows } = await pool.query("SELECT id FROM vendors WHERE is_demo = TRUE");
    const uniqueIds = new Set(vendorRows.map(r => r.id));
    assert.strictEqual(uniqueIds.size, vendorRows.length, 'Vendor IDs should be unique');
    console.log('Test: Unique vendor IDs - Passed');

    // 2. Service count check
    const { rows: serviceRows } = await pool.query("SELECT id FROM services WHERE vendor_id IN (SELECT id FROM vendors WHERE is_demo = TRUE)");
    assert.strictEqual(serviceRows.length >= 60, true, 'Should have at least 60 services');
    console.log('Test: Service distribution - Passed');

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
