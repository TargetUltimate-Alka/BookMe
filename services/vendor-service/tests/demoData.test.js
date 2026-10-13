const assert = require('assert');
const db = require('../src/shared/db');
const inMemoryStore = require('../src/shared/inMemoryStore');
const { generateDemoData } = require('../src/scripts/generateDemoData');
const vendorRepo = require('../src/modules/vendor/repository/vendorRepository');

async function runTests() {
  try {
    console.log('Running Demo Data & 60-Category Seed verification tests...');

    // 1. Run idempotent generator first time
    const firstRun = await generateDemoData();
    assert.strictEqual(firstRun.totalDemoVendors >= 500, true, 'Should have at least 500 demo vendors');
    assert.strictEqual(firstRun.totalDemoServices >= 60, true, 'Should have at least 60 demo services');

    // 2. Uniqueness & safety flags check
    const demoVendors = db.isPgActive()
      ? (await db.query('SELECT * FROM vendors WHERE is_demo = TRUE')).rows
      : inMemoryStore.vendors.filter((v) => v.is_demo === true);

    const uniqueIds = new Set(demoVendors.map((r) => r.id));
    assert.strictEqual(uniqueIds.size, demoVendors.length, 'Demo Vendor IDs must be unique');
    assert.strictEqual(demoVendors.length, 500, 'Exactly 500 deterministic demo vendors should exist');

    // Verify no demo vendor is falsely marked verified
    const falselyVerified = demoVendors.filter((v) => v.verified === true);
    assert.strictEqual(falselyVerified.length, 0, 'Demo vendors must NEVER be marked as verified KYC businesses');
    console.log('Test: 500 unique fictional demo vendors with verified=false & is_demo=true - Passed');

    // 3. Service distribution across all 60 SRS categories
    const demoServices = db.isPgActive()
      ? (await db.query("SELECT * FROM services WHERE id LIKE 'svc_demo_%'")).rows
      : inMemoryStore.services.filter((s) => String(s.id).startsWith('svc_demo_'));

    assert.strictEqual(demoServices.length >= 60, true, 'Should have at least 60 demo services');
    const coveredCategories = new Set(demoServices.map((s) => s.category_id));
    assert.strictEqual(coveredCategories.size, 60, 'All 60 SRS service categories must be covered by demo services');
    console.log('Test: 60+ demo services covering all 60 SRS service categories - Passed');

    // 4. Idempotency check (running a second time must not duplicate records)
    const secondRun = await generateDemoData();
    assert.strictEqual(secondRun.addedVendorsMem, 0, 'Second run must add 0 duplicate demo vendors');
    assert.strictEqual(secondRun.addedServicesMem, 0, 'Second run must add 0 duplicate demo services');
    console.log('Test: Idempotent re-run (no duplicates, no truncation) - Passed');

    // 5. Search isolation check (live search excludes demo vendors unless includeDemo=true)
    const liveSearch = await vendorRepo.advancedSearchVendors({ limit: 100 });
    const leakedDemo = liveSearch.items.filter((v) => v.isDemo === true);
    assert.strictEqual(leakedDemo.length, 0, 'Live customer search must not return demo vendors by default');

    const demoSearch = await vendorRepo.advancedSearchVendors({ includeDemo: true, limit: 50 });
    assert.strictEqual(demoSearch.totalItems >= 500, true, 'Search with includeDemo=true should include the 500 demo vendors');
    console.log('Test: Demo vendor isolation from live search - Passed');

    console.log('All demoData tests passed!');
  } catch (error) {
    console.error('DemoData test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
