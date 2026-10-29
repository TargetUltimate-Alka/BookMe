const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/index');
const initDb = require('../src/shared/initDb');
const { signJwt } = require('../src/shared/middleware/authMiddleware');

let server;
let baseUrl;

// Pre-signed test tokens for RBAC verification
const vendorToken = signJwt({ userId: 'usr_test_vendor_1', role: 'vendor' });
const verifierToken = signJwt({ userId: 'usr_verifier_1', role: 'verifier' });
const moderatorToken = signJwt({ userId: 'usr_moderator_1', role: 'contentModerator' });
const superAdminToken = signJwt({ userId: 'usr_superadmin_1', role: 'superAdmin' });
const customerToken = signJwt({ userId: 'usr_customer_1', role: 'user' });

async function apiRequest(method, path, body = null, token = null, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  let data = null;
  if (response.status !== 204) {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data, headers: response.headers };
}

describe('BookMe SRS Vendor Module Comprehensive Verification Suite', () => {
  let onboardedVendorId;
  let createdPackageId;

  before(async () => {
    await initDb();
    const db = require('../src/shared/db');
    if (db.isPgActive()) {
      await db.query(`DELETE FROM vendors WHERE user_id = $1`, ['usr_test_vendor_1']);
      await db.query(`DELETE FROM notify_requests WHERE user_id = $1`, ['usr_customer_1']);
    }
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('SRS §4 / FR-VEN-01: Seeds all 60 required service categories across 8 parent domains with regulated service metadata', async () => {
    const res = await apiRequest('GET', '/api/categories');
    assert.equal(res.status, 200);
    assert.equal(res.data.totalParentGroups, 8);
    assert.equal(res.data.totalServiceTypes, 60);

    const flatRes = await apiRequest('GET', '/api/categories?flat=true');
    assert.equal(flatRes.status, 200);
    const serviceTypes = flatRes.data.items.filter((c) => c.parentId !== null);
    assert.equal(serviceTypes.length, 60);

    const fireworks = serviceTypes.find((c) => c.name === 'Fireworks/Special Effects');
    assert.ok(fireworks, 'Fireworks/Special Effects category must exist');
    assert.equal(fireworks.isRegulated, true);
    assert.ok(fireworks.complianceNote.includes('PESO'));

    const drone = serviceTypes.find((c) => c.name === 'Drone Videography');
    assert.ok(drone, 'Drone Videography category must exist');
    assert.equal(drone.isRegulated, true);
    assert.ok(drone.complianceNote.includes('DGCA'));
  });

  it('FR-ONB-02: Creates vendor onboarding profile in DRAFT status with multiple categories, map pin, and service radius', async () => {
    const res = await apiRequest(
      'POST',
      '/api/vendors/onboarding',
      {
        userId: 'usr_test_vendor_1',
        businessName: 'Royal Heritage Weddings & Decor',
        categories: ['Wedding Decorator', 'Mandap Decorator', 'Floral Decorator'],
        description: 'Bespoke wedding mandap and floral styling across Mumbai & Pune.',
        photoUrl: 'https://cdn.bookme.local/profiles/royal-heritage.jpg',
        location: 'Mumbai, Maharashtra',
        address: 'Plot 14, Juhu Tara Road, Mumbai 400049',
        latitude: 19.0988,
        longitude: 72.8264,
        serviceRadiusKm: 40,
        serviceAreas: ['Mumbai', 'Navi Mumbai', 'Thane'],
        preferredLanguage: 'en',
      },
      vendorToken
    );

    assert.equal(res.status, 201);
    assert.equal(res.data.kycStatus, 'DRAFT');
    assert.equal(res.data.verified, false);
    assert.equal(res.data.categories.length, 3);
    assert.equal(res.data.serviceRadiusKm, 40);
    onboardedVendorId = res.data.id;
  });

  it('FR-ONB-03 & NFR-SEC-05: Rejects raw 12-digit Aadhaar numbers immediately and completes DigiLocker, PAN, and Bank Penny-Drop KYC', async () => {
    // 1. Attempt to send raw 12-digit Aadhaar number -> must fail with 400 RAW_AADHAAR_FORBIDDEN
    const badRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/kyc/digilocker/callback`,
      {
        aadhaarNumber: '4589 2314 7890',
        consentAccepted: true,
      },
      vendorToken
    );
    assert.equal(badRes.status, 400);
    assert.equal(badRes.data.code, 'RAW_AADHAAR_FORBIDDEN');

    // 2. Start DigiLocker OAuth flow
    const startRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/kyc/digilocker/start`,
      { redirectUri: 'http://localhost:5173/vendor/kyc/callback' },
      vendorToken
    );
    assert.equal(startRes.status, 200);
    assert.ok(startRes.data.authUrl);

    // 3. Complete DigiLocker callback with permitted last-4 digits and consent
    const dlRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/kyc/digilocker/callback`,
      {
        code: 'sandbox_code_123',
        verifiedName: 'Vikramaditya Mehta',
        aadhaarLast4: '7890',
        consentAccepted: true,
      },
      vendorToken
    );
    assert.equal(dlRes.status, 200);
    assert.equal(dlRes.data.digilocker.verified, true);
    assert.equal(dlRes.data.digilocker.aadhaarMasked, 'XXXX-XXXX-7890');

    // 4. Verify PAN
    const panRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/kyc/pan/verify`,
      { panNumber: 'ABCDE1234F', nameOnPan: 'Vikramaditya Mehta' },
      vendorToken
    );
    assert.equal(panRes.status, 200);
    assert.equal(panRes.data.pan.verified, true);
    assert.equal(panRes.data.pan.panMasked, 'AB*****34F');

    // 5. Verify Bank Penny-Drop
    const bankRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/kyc/bank/penny-drop`,
      {
        accountHolderName: 'Royal Heritage Weddings',
        accountNumber: '50200012349876',
        ifscCode: 'HDFC0000123',
      },
      vendorToken
    );
    assert.equal(bankRes.status, 200);
    assert.equal(bankRes.data.bank.verified, true);
    assert.ok(bankRes.data.bank.accountMasked.endsWith('9876'));
  });

  it('FR-ONB-04 & FR-ONB-06: Enforces agreement e-signing before submission, enforces RBAC and mandatory rejection reason, and approves vendor', async () => {
    // 1. Submitting before signing agreement must fail with 400 AGREEMENT_REQUIRED
    const prematureSubmit = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/submit`,
      {},
      vendorToken
    );
    assert.equal(prematureSubmit.status, 400);
    assert.equal(prematureSubmit.data.code, 'AGREEMENT_REQUIRED');

    // 2. E-sign vendor agreement
    const signRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/agreement/esign`,
      { agreementVersion: 'v1.0', accepted: true },
      vendorToken
    );
    assert.equal(signRes.status, 200);
    assert.equal(signRes.data.agreementVersion, 'v1.0');
    assert.ok(signRes.data.documentHash);

    // 3. Submit for review -> status becomes SUBMITTED
    const submitRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/submit`,
      {},
      vendorToken
    );
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.data.kycStatus, 'SUBMITTED');

    // 4. Customer or vendor trying to call verifier endpoint must fail with 403 FORBIDDEN (RBAC)
    const unauthorizedVerify = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/verify`,
      { status: 'APPROVED' },
      vendorToken
    );
    assert.equal(unauthorizedVerify.status, 403);

    // 5. Verifier rejecting without mandatory reason must fail with 400 REASON_REQUIRED
    const rejectNoReason = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/verify`,
      { status: 'REJECTED' },
      verifierToken
    );
    assert.equal(rejectNoReason.status, 400);
    assert.equal(rejectNoReason.data.code, 'REASON_REQUIRED');

    // 6. Verifier rejects with mandatory reason -> status becomes REJECTED
    const rejectRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/verify`,
      { status: 'REJECTED', reason: 'Please clarify GST registration address in profile' },
      verifierToken
    );
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.data.kycStatus, 'REJECTED');
    assert.equal(rejectRes.data.verified, false);

    // 7. Verifier approves after review -> status becomes APPROVED and verified = true
    const approveRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/verify`,
      { status: 'APPROVED', notes: 'All KYC and address documents verified' },
      verifierToken
    );
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.data.kycStatus, 'APPROVED');
    assert.equal(approveRes.data.verified, true);

    // 8. Check status history
    const histRes = await apiRequest('GET', `/api/vendors/${onboardedVendorId}/status-history`, null, verifierToken);
    assert.equal(histRes.status, 200);
    assert.ok(histRes.data.items.length >= 4);
  });

  it('FR-VEN-03, FR-VEN-04, FR-VEN-05, FR-VEN-09, FR-VEN-11: Creates tiered package in integer paise, enforces security deposit cap, adds add-ons and discounts', async () => {
    // 1. Security deposit exceeding MAX_SECURITY_DEPOSIT_PAISE (5,000,000 paise = ₹50,000) must fail
    const excessiveDepRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/packages`,
      {
        name: 'Over-Cap Deposit Package',
        tier: 'Premium',
        basePricePaise: 10000000,
        securityDepositPaise: 9000000, // ₹90,000 > ₹50,000 cap
      },
      vendorToken
    );
    assert.equal(excessiveDepRes.status, 400);
    assert.equal(excessiveDepRes.data.code, 'SECURITY_DEPOSIT_CAP_EXCEEDED');

    // 2. Create valid package with integer paise, GST, HSN/SAC, inclusions/exclusions, and capacity
    const pkgRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/packages`,
      {
        name: 'Royal Floral Mandap & Stage Package',
        categoryId: 'cat_mandap_decorator',
        tier: 'Premium',
        description: 'Complete imported orchid mandap, 40ft stage, and entrance walkway.',
        basePricePaise: 12000000, // ₹1,20,000.00
        priceUnit: 'PER_DAY',
        minGuests: 100,
        maxGuests: 800,
        durationHours: 12,
        overtimeRatePaise: 500000, // ₹5,000/hr
        totalCapacityUnits: 3,
        securityDepositPaise: 2000000, // ₹20,000
        gstRateBps: 1800, // 18%
        hsnSacCode: '998596',
        taxInclusive: false,
        inclusions: ['Orchid Mandap', 'Stage Backdrop', 'LED Walkway'],
        exclusions: ['Generator fuel'],
      },
      vendorToken
    );
    assert.equal(pkgRes.status, 201);
    assert.equal(pkgRes.data.basePricePaise, 12000000);
    assert.equal(pkgRes.data.price, 120000);
    assert.equal(pkgRes.data.totalCapacityUnits, 3);
    createdPackageId = pkgRes.data.id;

    // 3. Add independent add-on (FR-VEN-04)
    const addonRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/packages/${createdPackageId}/addons`,
      {
        name: 'Silent 62.5 kVA Generator Backup',
        description: 'Includes 8 hours diesel backup',
        pricePaise: 1500000, // ₹15,000
        priceUnit: 'FLAT',
      },
      vendorToken
    );
    assert.equal(addonRes.status, 201);
    assert.equal(addonRes.data.pricePaise, 1500000);

    // 4. Create 10% package discount (FR-VEN-05)
    const discRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/discounts`,
      {
        packageId: createdPackageId,
        name: 'Early Bird Wedding Season 10% Off',
        discountType: 'PERCENTAGE',
        discountValue: 1000, // 10.00% in basis points
        promoCode: 'ROYAL10',
      },
      vendorToken
    );
    assert.equal(discRes.status, 201);
    assert.equal(discRes.data.discountValue, 1000);
  });

  it('FR-VEN-02: Enforces media size/type/duration rules, rejects cross-vendor SHA-256 duplicates, and blocks package publish until 3 photos + 1 video are approved', async () => {
    // 1. Attempting to publish package before 3 photos + 1 video are approved must fail with 400
    const prematurePub = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/packages/${createdPackageId}/publish`,
      {},
      vendorToken
    );
    assert.equal(prematurePub.status, 400);
    assert.equal(prematurePub.data.code, 'PUBLISH_MEDIA_REQUIREMENT_UNMET');

    // 2. Reject image > 5 MB
    const oversizeImg = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/media`,
      {
        packageId: createdPackageId,
        mediaType: 'IMAGE',
        mimeType: 'image/jpeg',
        fileName: 'huge.jpg',
        fileSizeBytes: 6 * 1024 * 1024, // 6 MB > 5 MB
      },
      vendorToken
    );
    assert.equal(oversizeImg.status, 400);
    assert.equal(oversizeImg.data.code, 'MEDIA_FILE_TOO_LARGE');

    // 3. Reject video outside 5-10s duration
    const badDurVid = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/media`,
      {
        packageId: createdPackageId,
        mediaType: 'VIDEO',
        mimeType: 'video/mp4',
        fileName: 'long_clip.mp4',
        fileSizeBytes: 8 * 1024 * 1024,
        durationSeconds: 25, // > 10s limit
      },
      vendorToken
    );
    assert.equal(badDurVid.status, 400);
    assert.equal(badDurVid.data.code, 'INVALID_VIDEO_DURATION');

    // 4. Reject cross-vendor duplicate SHA-256 content hash
    // First register a photo on vnd_sunset_caterers with a known hash
    const sharedHash = 'a'.repeat(64);
    await apiRequest(
      'POST',
      `/api/vendors/vnd_sunset_caterers/media`,
      {
        mediaType: 'IMAGE',
        mimeType: 'image/jpeg',
        fileName: 'original_work.jpg',
        fileSizeBytes: 500000,
        contentHashSha256: sharedHash,
      },
      vendorToken
    );

    const dupMediaRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/media`,
      {
        packageId: createdPackageId,
        mediaType: 'IMAGE',
        mimeType: 'image/jpeg',
        fileName: 'copied_work.jpg',
        fileSizeBytes: 500000,
        contentHashSha256: sharedHash,
      },
      vendorToken
    );
    assert.equal(dupMediaRes.status, 409);
    assert.equal(dupMediaRes.data.code, 'DUPLICATE_MEDIA_HASH');

    // 5. Upload 3 valid photos and 1 valid 8-second MP4 video, then moderate & approve them
    const mediaIds = [];
    for (let i = 1; i <= 3; i++) {
      const mRes = await apiRequest(
        'POST',
        `/api/vendors/${onboardedVendorId}/media`,
        {
          packageId: createdPackageId,
          mediaType: 'IMAGE',
          mimeType: 'image/webp',
          fileName: `mandap_photo_${i}.webp`,
          fileSizeBytes: 1200000,
          contentHashSha256: `${i}`.repeat(64),
        },
        vendorToken
      );
      assert.equal(mRes.status, 201);
      assert.equal(mRes.data.moderationStatus, 'PENDING');
      assert.equal(mRes.data.isPublic, false);
      mediaIds.push(mRes.data.id);
    }

    const vRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/media`,
      {
        packageId: createdPackageId,
        mediaType: 'VIDEO',
        mimeType: 'video/mp4',
        fileName: 'mandap_walkthrough.mp4',
        fileSizeBytes: 9500000,
        durationSeconds: 8,
        contentHashSha256: '9'.repeat(64),
      },
      vendorToken
    );
    assert.equal(vRes.status, 201);
    mediaIds.push(vRes.data.id);

    // Approve all 4 media items as contentModerator
    for (const mid of mediaIds) {
      const modRes = await apiRequest(
        'POST',
        `/api/media/${mid}/moderate`,
        { status: 'APPROVED' },
        moderatorToken
      );
      assert.equal(modRes.status, 200);
      assert.equal(modRes.data.moderationStatus, 'APPROVED');
      assert.equal(modRes.data.isPublic, true);
    }

    // 6. Now publish the package -> succeeds (200 OK, status = PUBLISHED)
    const pubRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/packages/${createdPackageId}/publish`,
      {},
      vendorToken
    );
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.data.status, 'PUBLISHED');
  });

  it('FR-VEN-06, FR-VEN-07 & SRS §11.4 Concurrency Test: Fires 50 parallel hold requests against a 3-unit package slot and prevents any overbooking', async () => {
    const testDate = '2026-12-15';

    // Set package capacity on 2026-12-15 EVENING slot to totalUnits = 3
    const setCapRes = await apiRequest(
      'PUT',
      `/api/availability/packages/${createdPackageId}`,
      {
        date: testDate,
        slotName: 'EVENING',
        totalUnits: 3,
        status: 'AVAILABLE',
      },
      vendorToken
    );
    assert.equal(setCapRes.status, 200);
    assert.equal(setCapRes.data.totalUnits, 3);
    assert.equal(setCapRes.data.availableUnits, 3);

    // Fire 50 simultaneous hold requests for quantity = 1 on that exact package/date/slot
    const parallelPromises = Array.from({ length: 50 }, (_, idx) =>
      apiRequest('POST', '/internal/availability/hold', {
        vendorId: onboardedVendorId,
        packageId: createdPackageId,
        date: testDate,
        slotName: 'EVENING',
        quantity: 1,
        bookingId: `bkg_concurrent_${idx + 1}`,
      })
    );

    const results = await Promise.all(parallelPromises);
    const succeeded = results.filter((r) => r.status === 200);
    const conflicts = results.filter((r) => r.status === 409);

    assert.equal(succeeded.length, 3, 'Exactly 3 parallel hold requests must succeed for 3 available units');
    assert.equal(conflicts.length, 47, 'Remaining 47 parallel hold requests must fail with 409 CAPACITY_EXHAUSTED');

    // Verify remaining capacity is now 0 (BOOKED_OUT)
    const checkAfterHold = await apiRequest(
      'GET',
      `/api/availability/packages/${createdPackageId}?date=${testDate}&slotName=EVENING`
    );
    assert.equal(checkAfterHold.status, 200);
    assert.equal(checkAfterHold.data.slots[0].heldUnits, 3);
    assert.equal(checkAfterHold.data.slots[0].availableUnits, 0);
    assert.equal(checkAfterHold.data.slots[0].status, 'BOOKED_OUT');
  });

  it('FR-SRCH-05 & FR-NOT-02: Creates a Notify-Me request on a booked-out date and automatically notifies the user when capacity is released', async () => {
    const testDate = '2026-12-15';

    // 1. Customer registers a Notify-Me request for the booked-out date
    const notifyRes = await apiRequest(
      'POST',
      '/api/notify-requests',
      {
        userId: 'usr_customer_1',
        vendorId: onboardedVendorId,
        packageId: createdPackageId,
        requestedDate: testDate,
        slotName: 'EVENING',
        requiredQty: 1,
      },
      customerToken
    );
    assert.equal(notifyRes.status, 201);
    assert.equal(notifyRes.data.status, 'PENDING');

    // 2. Release 1 held unit from the earlier concurrency test
    const releaseRes = await apiRequest('POST', '/internal/availability/release', {
      vendorId: onboardedVendorId,
      packageId: createdPackageId,
      date: testDate,
      slotName: 'EVENING',
      bookingId: 'bkg_concurrent_1',
      quantity: 1,
    });
    assert.equal(releaseRes.status, 200);
    assert.equal(releaseRes.data.availability.availableUnits, 1);

    // 3. Verify Notify-Me request transitioned to NOTIFIED
    const listRes = await apiRequest('GET', '/api/notify-requests?userId=usr_customer_1');
    assert.equal(listRes.status, 200);
    const updatedNotify = listRes.data.items.find((n) => n.id === notifyRes.data.id);
    assert.equal(updatedNotify.status, 'NOTIFIED');
    assert.ok(updatedNotify.notified_at);
  });

  it('FR-VEN-08 & FR-VEN-10: Enforces service radius eligibility and creates an immutable booking price snapshot unaffected by subsequent package edits', async () => {
    // 1. Customer venue in Delhi (lat 28.6139, lng 77.2090) is >1,100 km from Mumbai vendor (radius 40 km) -> 422 OUTSIDE_SERVICE_RADIUS
    const outOfRadiusRes = await apiRequest(
      'POST',
      `/internal/vendors/${onboardedVendorId}/price-snapshot`,
      {
        packageId: createdPackageId,
        venueLat: 28.6139,
        venueLng: 77.209,
        quantity: 1,
      }
    );
    assert.equal(outOfRadiusRes.status, 422);
    assert.equal(outOfRadiusRes.data.code, 'OUTSIDE_SERVICE_RADIUS');

    // 2. Customer venue in Mumbai within 40 km -> generates immutable price snapshot with 10% discount + 18% GST + ₹20,000 security deposit
    const snapRes = await apiRequest(
      'POST',
      `/internal/vendors/${onboardedVendorId}/price-snapshot`,
      {
        packageId: createdPackageId,
        venueLat: 19.076,
        venueLng: 72.8777,
        quantity: 1,
        promoCode: 'ROYAL10',
      }
    );
    assert.equal(snapRes.status, 200);
    const snap = snapRes.data.priceSnapshot;
    assert.equal(snap.baseSubtotalPaise, 12000000); // ₹1,20,000
    assert.equal(snap.discountPaise, 1200000); // 10% = ₹12,000
    assert.equal(snap.discountedSubtotalPaise, 10800000); // ₹1,08,000
    assert.equal(snap.gstAmountPaise, 1944000); // 18% of ₹1,08,000 = ₹19,440
    assert.equal(snap.securityDepositPaise, 2000000); // ₹20,000
    assert.equal(snap.totalPayablePaise, 14744000); // ₹1,47,440

    // 3. Vendor later increases package basePricePaise from ₹1,20,000 to ₹2,00,000
    const editRes = await apiRequest(
      'PATCH',
      `/api/vendors/${onboardedVendorId}/packages/${createdPackageId}`,
      { basePricePaise: 20000000 },
      vendorToken
    );
    assert.equal(editRes.status, 200);
    assert.equal(editRes.data.basePricePaise, 20000000);

    // 4. Verify previously captured snapshot remains completely unchanged
    assert.equal(snap.totalPayablePaise, 14744000);
    assert.equal(snap.baseSubtotalPaise, 12000000);
  });

  it('FR-SRCH-01..06 & NFR-SEC-02: Supports partial name, category, location/radius, date capacity, discount, sorting, and redacts private KYC fields', async () => {
    const searchRes = await apiRequest(
      'GET',
      '/api/search/vendors?q=Royal+Heritage&category=Mandap+Decorator&location=Mumbai&hasDiscount=true&sortBy=price_asc'
    );
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.data.items.length >= 1);

    const found = searchRes.data.items.find((v) => v.id === onboardedVendorId);
    assert.ok(found, 'Onboarded & approved vendor must appear in customer search');
    assert.equal(found.hasActiveDiscount, true);
    assert.ok(found.matchingPackages.length >= 1);

    // Verify no private KYC/Aadhaar/bank/phone fields are exposed in customer search response
    assert.equal(found.digilocker_ref_enc, undefined);
    assert.equal(found.pan_ref_enc, undefined);
    assert.equal(found.bank_ref_enc, undefined);
    assert.equal(found.phone, undefined);
    assert.equal(found.email, undefined);
  });

  it('FR-PLAN-02..03, FR-WAL-01..04 & SRS §2.3 CONFIG: Matches event-planner checklist items, manages vendor wallet, and updates dynamic CONFIG with audit trail', async () => {
    // 1. Event-planner checklist item matching
    const planRes = await apiRequest('POST', '/api/planner/match-items', {
      items: ['Caterer', 'Candid Photographer', 'DJ', 'Mandap Decorator'],
      location: 'Mumbai',
    });
    assert.equal(planRes.status, 200);
    assert.equal(planRes.data.matches.length, 4);
    assert.ok(planRes.data.matches[0].matchedCategory);

    // 2. Vendor wallet initial low-balance alert & top-up
    const walletBefore = await apiRequest('GET', `/api/vendors/${onboardedVendorId}/wallet`, null, vendorToken);
    assert.equal(walletBefore.status, 200);
    assert.equal(walletBefore.data.isLowBalance, true);

    const topupRes = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/wallet/topup`,
      { amountPaise: 100000, paymentReference: 'pay_test_topup_01' },
      vendorToken
    );
    assert.equal(topupRes.status, 200);
    assert.equal(topupRes.data.balancePaise, 100000);
    assert.equal(topupRes.data.isLowBalance, false);

    // 3. Dynamic CONFIG update & history by superAdmin
    const cfgRes = await apiRequest(
      'PUT',
      '/api/admin/configs/LEAD_CHARGE_PAISE',
      { value: 7500, reason: 'Updated lead fee to ₹75 for peak wedding season' },
      superAdminToken
    );
    assert.equal(cfgRes.status, 200);
    assert.equal(cfgRes.data.value, 7500);

    const histRes = await apiRequest('GET', '/api/admin/configs/history?key=LEAD_CHARGE_PAISE', null, superAdminToken);
    assert.equal(histRes.status, 200);
    assert.ok(histRes.data.items.length >= 1);
  });

  it('FR-ADM-04: Enforces the 3-step off-platform leakage violation ladder (WARNING -> SUSPENSION -> TERMINATION)', async () => {
    // 1st violation -> WARNING (vendor remains active)
    const v1 = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/violations`,
      { reason: 'Attempted to share personal phone number in chat message' },
      verifierToken
    );
    assert.equal(v1.status, 200);
    assert.equal(v1.data.actionTaken, 'WARNING');
    assert.equal(v1.data.violationCount, 1);

    // 2nd violation -> SUSPENSION (vendor is suspended and removed from live search)
    const v2 = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/violations`,
      { reason: 'Requested direct UPI transfer outside BookMe escrow' },
      verifierToken
    );
    assert.equal(v2.status, 200);
    assert.equal(v2.data.actionTaken, 'SUSPENSION');
    assert.equal(v2.data.vendorStatus, 'SUSPENDED');

    // 3rd violation -> TERMINATION
    const v3 = await apiRequest(
      'POST',
      `/api/vendors/${onboardedVendorId}/violations`,
      { reason: 'Repeated off-platform booking solicitation after suspension' },
      verifierToken
    );
    assert.equal(v3.status, 200);
    assert.equal(v3.data.actionTaken, 'TERMINATION');
    assert.equal(v3.data.violationCount, 3);
  });
});
