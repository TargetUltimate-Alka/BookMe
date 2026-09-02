const http = require('http');
const app = require('../src/index');
const initDb = require('../src/shared/initDb');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('--- STARTING COMPREHENSIVE VENDOR SERVICE TEST SUITE ---');
  await initDb();
  const server = app.listen(3097);

  try {
    // 1. Create Vendor
    console.log('[1/12] Testing POST /api/vendors');
    const createVendorRes = await request(
      { hostname: 'localhost', port: 3097, path: '/api/vendors', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      {
        userId: `usr_suite_${Date.now()}`,
        businessName: 'Royal Moments Photography',
        category: 'photography',
        description: 'Award winning candid wedding photography and cinematic films',
        location: 'Ahmedabad, Gujarat',
      }
    );
    if (createVendorRes.status !== 201) throw new Error(`Create vendor failed with ${createVendorRes.status}`);
    const vendorId = createVendorRes.body.id;
    console.log('✓ Vendor Created:', vendorId);

    // 2. Fetch Vendor
    console.log('[2/12] Testing GET /api/vendors/:id');
    const getVendorRes = await request({ hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}`, method: 'GET' });
    if (getVendorRes.status !== 200) throw new Error('Get vendor failed');
    console.log('✓ Vendor Retrieved:', getVendorRes.body.businessName);

    // 3. Search Vendors
    console.log('[3/12] Testing GET /api/vendors?category=photography');
    const searchRes = await request({ hostname: 'localhost', port: 3097, path: '/api/vendors?category=photography', method: 'GET' });
    if (searchRes.status !== 200 || searchRes.body.items.length === 0) throw new Error('Search failed');
    console.log('✓ Search returned items count:', searchRes.body.items.length);

    // 4. Create Service
    console.log('[4/12] Testing POST /api/vendors/:id/services');
    const createServiceRes = await request(
      { hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/services`, method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { title: 'Full Day Candid Wedding Shoot', description: '2 Photographers + 1 Cinematographer', basePrice: 55000 }
    );
    if (createServiceRes.status !== 201) throw new Error('Create service failed');
    const serviceId = createServiceRes.body.id;
    console.log('✓ Service Created:', serviceId, createServiceRes.body.title);

    // 5. Get Services
    console.log('[5/12] Testing GET /api/vendors/:id/services');
    const getServicesRes = await request({ hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/services`, method: 'GET' });
    if (getServicesRes.status !== 200 || getServicesRes.body.length === 0) throw new Error('Get services failed');
    console.log('✓ Services count:', getServicesRes.body.length);

    // 6. Update Service
    console.log('[6/12] Testing PATCH /api/vendors/:id/services/:serviceId');
    const updateServiceRes = await request(
      { hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/services/${serviceId}`, method: 'PATCH', headers: { 'Content-Type': 'application/json' } },
      { basePrice: 60000 }
    );
    if (updateServiceRes.status !== 200 || updateServiceRes.body.basePrice !== 60000) throw new Error('Update service failed');
    console.log('✓ Service Updated price:', updateServiceRes.body.basePrice);

    // 7. Create Package
    console.log('[7/12] Testing POST /api/vendors/:id/packages');
    const createPackageRes = await request(
      { hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/packages`, method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Platinum Wedding Package', serviceIds: [serviceId], price: 95000 }
    );
    if (createPackageRes.status !== 201) throw new Error('Create package failed');
    const packageId = createPackageRes.body.id;
    console.log('✓ Package Created:', packageId, createPackageRes.body.name);

    // 8. Get Packages
    console.log('[8/12] Testing GET /api/vendors/:id/packages');
    const getPackagesRes = await request({ hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/packages`, method: 'GET' });
    if (getPackagesRes.status !== 200 || getPackagesRes.body.length === 0) throw new Error('Get packages failed');
    console.log('✓ Packages count:', getPackagesRes.body.length);

    // 9. Block Date (Availability)
    console.log('[9/12] Testing POST /api/vendors/:id/availability/block');
    const blockDateRes = await request(
      { hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/availability/block`, method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { date: '2026-12-25', reason: 'Booked for Royal Destination Wedding' }
    );
    if (blockDateRes.status !== 201) throw new Error('Block date failed');
    const blockId = blockDateRes.body.id;
    console.log('✓ Date Blocked:', blockDateRes.body.date, 'BlockId:', blockId);

    // 10. Check Availability
    console.log('[10/12] Testing GET /api/vendors/:id/availability?date=2026-12-25');
    const checkBlockedRes = await request({ hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/availability?date=2026-12-25`, method: 'GET' });
    if (checkBlockedRes.status !== 200 || checkBlockedRes.body.available !== false) throw new Error('Availability check failed for blocked date');
    console.log('✓ Availability checked correctly (available: false for Dec 25)');

    // 11. Check Open Date Availability
    console.log('[11/12] Testing GET /api/vendors/:id/availability?date=2026-12-26');
    const checkOpenRes = await request({ hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/availability?date=2026-12-26`, method: 'GET' });
    if (checkOpenRes.status !== 200 || checkOpenRes.body.available !== true) throw new Error('Availability check failed for open date');
    console.log('✓ Availability checked correctly (available: true for Dec 26)');

    // 12. Unblock Date
    console.log('[12/12] Testing DELETE /api/vendors/:id/availability/block/:blockId');
    const unblockRes = await request({ hostname: 'localhost', port: 3097, path: `/api/vendors/${vendorId}/availability/block/${blockId}`, method: 'DELETE' });
    if (unblockRes.status !== 204) throw new Error('Unblock date failed');
    console.log('✓ Date Unblocked successfully');

    console.log('\n======================================================');
    console.log('🎉 ALL 12 END-TO-END INTEGRATION TESTS PASSED 100%! 🎉');
    console.log('======================================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
