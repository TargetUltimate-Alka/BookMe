const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const pool = require('../../src/shared/db/pool');

// Helper to sign JWT tokens for contract verification testing
function createTestToken(payload, secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

describe('Event Booking Service - Comprehensive Contract Conformance Test Suite', () => {
  const testCustomer = {
    sub: 'cust_conformance_1',
    role: 'customer',
    email: 'customer@bookme.test',
  };
  const testVendor = {
    sub: 'vnd_conformance_1',
    role: 'vendor',
    email: 'vendor@bookme.test',
  };
  const testAdmin = {
    sub: 'admin_conformance_1',
    role: 'admin',
    email: 'admin@bookme.test',
  };

  const customerToken = createTestToken(testCustomer);
  const vendorToken = createTestToken(testVendor);
  const adminToken = createTestToken(testAdmin);

  const customerAuthHeaders = {
    Authorization: `Bearer ${customerToken}`,
  };
  const vendorAuthHeaders = {
    Authorization: `Bearer ${vendorToken}`,
  };
  const adminAuthHeaders = {
    Authorization: `Bearer ${adminToken}`,
  };

  describe('1. Foundation, Health & Common Error Envelope Conformance', () => {
    it('GET /health returns 200 with microservice health UP', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'UP',
        service: 'event-booking-service',
      });
    });

    it('GET /v1/health returns 200 with ISO timestamp per OpenAPI HealthResponse', async () => {
      const res = await request(app).get('/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.service).toBe('event-booking-service');
      expect(res.body.timestamp).toBeDefined();
    });

    it('returns contract-compliant ErrorResponse on 404', async () => {
      const res = await request(app).get('/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.message).toBeDefined();
      expect(res.body.traceId).toBeDefined();
    });

    it('returns contract-compliant ErrorResponse on 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/events')
        .set('X-User-Id', '')
        .set('X-Dev-User-Id', '')
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toBeDefined();
      expect(res.body.traceId).toBeDefined();
    });

    it('returns contract-compliant ErrorResponse on 403 Forbidden', async () => {
      const res = await request(app)
        .get('/admin/bookings')
        .set(customerAuthHeaders);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toBeDefined();
      expect(res.body.traceId).toBeDefined();
    });
  });

  describe('2. Idempotency-Key Middleware (ADR-005)', () => {
    it('replays cached response when identical Idempotency-Key is provided', async () => {
      const idemKey = `idemp_test_${Date.now()}`;
      const payload = {
        name: 'Idempotent Event',
        dateFrom: '2027-06-01T10:00:00.000Z',
        dateTo: '2027-06-01T18:00:00.000Z',
        venueLocation: {
          address: '100 Marina St',
          city: 'Mumbai',
          state: 'MH',
          postalCode: '400001',
          latitude: 18.922,
          longitude: 72.834,
        },
        guestCount: 150,
      };

      const res1 = await request(app)
        .post('/events')
        .set(customerAuthHeaders)
        .set('Idempotency-Key', idemKey)
        .send(payload);

      expect(res1.status).toBe(201);
      const originalId = res1.body.id;

      // Replay request with same idempotency key
      const res2 = await request(app)
        .post('/events')
        .set(customerAuthHeaders)
        .set('Idempotency-Key', idemKey)
        .send(payload);

      expect(res2.status).toBe(201);
      expect(res2.body.id).toBe(originalId);
      expect(res2.headers['x-cache-lookup']).toBe('HIT');
    });
  });

  describe('3. Event Planner Operations (planner.yaml & FR-PLAN-*)', () => {
    let createdEventId = null;

    it('POST /events creates an event with OpenAPI contract format (201 Created)', async () => {
      const res = await request(app)
        .post('/events')
        .set(customerAuthHeaders)
        .send({
          name: 'Grand Wedding Reception',
          dateFrom: '2027-08-15T09:00:00.000Z',
          dateTo: '2027-08-15T23:00:00.000Z',
          venueLocation: {
            address: '42 Royal Palace Road',
            city: 'Delhi',
            state: 'DL',
            postalCode: '110001',
            latitude: 28.6139,
            longitude: 77.209,
          },
          guestCount: 300,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Grand Wedding Reception');
      createdEventId = res.body.id;
    });

    it('GET /events lists customer events (200 OK)', async () => {
      const res = await request(app)
        .get('/events')
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data || res.body.items)).toBe(true);
    });

    it('GET /events/:id returns single event details (200 OK)', async () => {
      const res = await request(app)
        .get(`/events/${createdEventId}`)
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdEventId);
    });

    it('PUT /events/:id updates event details (200 OK)', async () => {
      const res = await request(app)
        .put(`/events/${createdEventId}`)
        .set(customerAuthHeaders)
        .send({
          name: 'Grand Royal Wedding Reception',
          guestCount: 350,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Grand Royal Wedding Reception');
      expect(res.body.guest_count || res.body.guestCount).toBe(350);
    });

    it('GET /events/:id/dashboard returns aggregated dashboard (200 OK)', async () => {
      const res = await request(app)
        .get(`/events/${createdEventId}/dashboard`)
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(res.body.event).toBeDefined();
      expect(res.body.budgetSummary).toBeDefined();
      expect(res.body.checklistSummary).toBeDefined();
    });

    it('GET /events/:id/suggestions returns vendor recommendations (200 OK)', async () => {
      const res = await request(app)
        .get(`/events/${createdEventId}/suggestions`)
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.suggested_categories || res.body.vendor_tips || res.body)).toBe(true);
    });

    it('PUT /events/:id/budget updates budget categories (200 OK)', async () => {
      const res = await request(app)
        .put(`/events/${createdEventId}/budget`)
        .set(customerAuthHeaders)
        .send({
          categories: [
            { category: 'Catering', planned_amount: 150000 },
            { category: 'Photography', planned_amount: 80000 },
          ],
        });

      expect(res.status).toBe(200);
    });

    it('POST /events/:id/checklist creates a checklist task (201 Created)', async () => {
      const res = await request(app)
        .post(`/events/${createdEventId}/checklist`)
        .set(customerAuthHeaders)
        .send({
          task: 'Finalize invitation card design',
          due_date: '2027-05-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.task).toBe('Finalize invitation card design');
    });

    it('POST /events/:id/items adds a requirement item and GET returns list (FR-PLAN-02)', async () => {
      const postRes = await request(app)
        .post(`/events/${createdEventId}/items`)
        .set(customerAuthHeaders)
        .send({
          categoryId: 'cat_catering',
          quantity: 1,
          notes: 'North Indian cuisine for 350 guests',
          budgetPaise: 15000000,
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.category || postRes.body.categoryId).toBeDefined();

      const getRes = await request(app)
        .get(`/events/${createdEventId}/items`)
        .set(customerAuthHeaders);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body.items || getRes.body)).toBe(true);
    });

    it('GET /events/:id/coverage generates coverage report (FR-PLAN-03)', async () => {
      const res = await request(app)
        .get(`/events/${createdEventId}/coverage`)
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(res.body.eventId).toBe(createdEventId);
      expect(res.body.totalItems).toBeDefined();
      expect(res.body.coveredItems).toBeDefined();
      expect(res.body.coveragePercent).toBeDefined();
    });
  });

  describe('4. Notify-Me Alerts (FR-NOT-02)', () => {
    it('POST /notify-me registers notification request for unavailable vendor (201 Created)', async () => {
      const res = await request(app)
        .post('/notify-me')
        .set(customerAuthHeaders)
        .send({
          vendorId: 'vnd_conformance_busy',
          targetDate: '2027-10-10',
          serviceCategory: 'Photography',
          channel: 'sms',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(['ACTIVE', 'REGISTERED']).toContain(res.body.status);
    });

    it('POST /notify-me enforces daily customer quota limit (max 3/day)', async () => {
      const quotaUser = { sub: `cust_quota_${Date.now()}`, role: 'customer' };
      const quotaToken = createTestToken(quotaUser);
      const quotaHeaders = { Authorization: `Bearer ${quotaToken}` };

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/notify-me')
          .set(quotaHeaders)
          .send({
            vendorId: `vnd_${i}`,
            targetDate: '2027-10-10',
            channel: 'in_app',
          });
        expect(res.status).toBe(201);
      }

      // 4th request must exceed quota
      const res4 = await request(app)
        .post('/notify-me')
        .set(quotaHeaders)
        .send({
          vendorId: 'vnd_excess',
          targetDate: '2027-10-10',
          channel: 'in_app',
        });

      expect(res4.status).toBe(429);
      expect(['RATE_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED']).toContain(res4.body.code);
    });
  });

  describe('5. Rush Surcharge Calculation (FR-BKG-06)', () => {
    it('POST /bookings/rush-quote calculates tiered rush surcharge correctly', async () => {
      // 1. Regular date (> 48h) -> 0%
      const regDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const resReg = await request(app)
        .post('/bookings/rush-quote')
        .send({ eventDate: regDate, baseAmountPaise: 100000 });

      expect(resReg.status).toBe(200);
      expect(resReg.body.isRush).toBe(false);
      expect(resReg.body.surchargePercent).toBe(0);
      expect(resReg.body.surchargePaise).toBe(0);
      expect(resReg.body.totalPaise).toBe(100000);

      // 2. Urgent rush (< 24h) -> 50%
      const rushDate = new Date(Date.now() + 12 * 3600 * 1000).toISOString().split('T')[0];
      const resRush = await request(app)
        .post('/bookings/rush-quote')
        .send({ eventDate: rushDate, baseAmountPaise: 100000 });

      expect(resRush.status).toBe(200);
      expect(resRush.body.isRush).toBe(true);
      expect(resRush.body.surchargePercent).toBe(50);
      expect(resRush.body.surchargePaise).toBe(50000);
      expect(resRush.body.totalPaise).toBe(150000);
    });

    it('GET /bookings/quote/rush calculates surcharge via query parameters per OpenAPI spec', async () => {
      const regDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const res = await request(app)
        .get(`/bookings/quote/rush?eventDate=${regDate}&baseAmountPaise=100000`);

      expect(res.status).toBe(200);
      expect(res.body.isRush).toBe(false);
      expect(res.body.rushSurchargePercent).toBe(0);
      expect(res.body.rushSurchargePaise).toBe(0);
      expect(res.body.totalAmountPaise).toBe(100000);
    });
  });

  describe('6. Booking Lifecycle, Negotiation, Check-in & Cancellation', () => {
    let bookingId = null;

    it('POST /bookings creates a booking in REQUESTED status with paise amounts (201 Created)', async () => {
      const res = await request(app)
        .post('/bookings')
        .set(customerAuthHeaders)
        .send({
          vendorId: 'vnd_conformance_1',
          packageId: 'pkg_conformance_1',
          eventDate: '2027-09-20',
          quantity: 1,
          custom_price: 500, // 50,000 paise
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('REQUESTED');
      expect(res.body.agreedAmountPaise).toBe(50000);
      expect(res.body.depositAmountPaise).toBe(20000); // 40%
      bookingId = res.body.id;
    });

    it('GET /bookings/:id/timeline retrieves audit transition log (FR-BKG-03)', async () => {
      const res = await request(app)
        .get(`/bookings/${bookingId}/timeline`)
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(res.body.bookingId).toBe(bookingId);
      expect(Array.isArray(res.body.timeline)).toBe(true);
      expect(res.body.timeline.length).toBeGreaterThan(0);
    });

    it('POST /bookings/:id/counter initiates structured negotiation (FR-BKG-03)', async () => {
      const res = await request(app)
        .post(`/bookings/${bookingId}/counter`)
        .set(vendorAuthHeaders)
        .send({
          amountPaise: 60000,
          reason: 'Weekend premium equipment fee',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.amountPaise).toBe(60000);

      // Customer accepts counter-offer
      const acceptRes = await request(app)
        .patch(`/bookings/${bookingId}/counter/${res.body.id}/accept`)
        .set(customerAuthHeaders);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.status).toBe('ACCEPTED');
      expect(acceptRes.body.agreedAmountPaise).toBe(60000);
    });

    it('PATCH /internal/bookings/:id/confirm-deposit transitions booking to CONFIRMED', async () => {
      const res = await request(app)
        .patch(`/internal/bookings/${bookingId}/confirm-deposit`)
        .set('X-Internal-Key', process.env.INTERNAL_API_KEY || 'dev-internal-key-123');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CONFIRMED');
    });

    it('PATCH /bookings/:id/delivery-choice selects delivery/pickup (FR-BKG-05)', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}/delivery-choice`)
        .set(customerAuthHeaders)
        .send({
          choice: 'DELIVERY',
          address: '42 Royal Palace Road, Delhi',
        });

      expect(res.status).toBe(200);
      expect(res.body.delivery_choice).toBe('DELIVERY');
    });

    it('PATCH /bookings/:id/delivery selects delivery via OpenAPI contract path and deliveryMode', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}/delivery`)
        .set(customerAuthHeaders)
        .send({
          deliveryMode: 'DELIVERY',
          deliveryAddress: { address: '55 Conformance Road, Delhi', city: 'Delhi' },
        });

      expect(res.status).toBe(200);
      expect(res.body.deliveryMode).toBe('DELIVERY');
    });

    it('POST /bookings/:id/check-in allows vendor GPS check-in (FR-BKG-07)', async () => {
      const res = await request(app)
        .post(`/bookings/${bookingId}/check-in`)
        .set(vendorAuthHeaders)
        .send({
          latitude: 28.6139,
          longitude: 77.209,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('POST /bookings/:id/confirm-completion confirms completion via OpenAPI contract path (FR-BKG-08)', async () => {
      const res = await request(app)
        .post(`/bookings/${bookingId}/confirm-completion`)
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('COMPLETED');
    });

    it('POST /bookings/:id/complete marks booking as COMPLETED via legacy alias', async () => {
      const createRes = await request(app)
        .post('/bookings')
        .set(customerAuthHeaders)
        .send({
          vendorId: 'vnd_conformance_1',
          packageId: 'pkg_conformance_1',
          eventDate: '2027-09-25',
          quantity: 1,
          custom_price: 300,
        });
      const bId = createRes.body.id;
      expect(bId).toBeDefined();
      await request(app).patch(`/bookings/${bId}/accept`).set(vendorAuthHeaders);
      await request(app).patch(`/internal/bookings/${bId}/confirm-deposit`).set('X-Internal-Key', 'dev-internal-key-123');
      await request(app).post(`/bookings/${bId}/check-in`).set(vendorAuthHeaders).send({ latitude: 28.6, longitude: 77.2 });

      const res = await request(app)
        .post(`/bookings/${bId}/complete`)
        .set(customerAuthHeaders);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
    });

    it('GET /bookings/:id/cancellation-quote quotes tiered refund & penalty amounts (SRS §2.4)', async () => {
      // Create a fresh booking for cancellation quote test
      const createRes = await request(app)
        .post('/bookings')
        .set(customerAuthHeaders)
        .send({
          vendorId: 'vnd_conformance_1',
          packageId: 'pkg_conformance_1',
          eventDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0], // 10 days away
          custom_price: 1000, // 100,000 paise
        });

      const cancelBkgId = createRes.body.id;

      // Customer cancellation quote (7-14 days -> 10% charge per SRS §2.4)
      const resCust = await request(app)
        .get(`/bookings/${cancelBkgId}/cancellation-quote`)
        .set(customerAuthHeaders);

      expect(resCust.status).toBe(200);
      expect(resCust.body.cancellingPartyRole).toBe('customer');
      expect(resCust.body.chargePercent).toBe(10);
      expect(resCust.body.chargeAmountPaise).toBe(10000); // 10% of 100,000

      // Vendor cancellation quote (7-14 days -> 30% vendor penalty per SRS §2.4)
      const resVnd = await request(app)
        .get(`/bookings/${cancelBkgId}/cancellation-quote`)
        .set(vendorAuthHeaders);

      expect(resVnd.status).toBe(200);
      expect(resVnd.body.cancellingPartyRole).toBe('vendor');
      expect(resVnd.body.vendorPenaltyPaise).toBe(30000); // 30% of 100,000

      // Also test GET /bookings/:id/cancellation-preview (OpenAPI contract path)
      const resPreview = await request(app)
        .get(`/bookings/${cancelBkgId}/cancellation-preview`)
        .set(customerAuthHeaders);

      expect(resPreview.status).toBe(200);
      expect(resPreview.body.cancelledByRole).toBe('customer');
      expect(resPreview.body.chargePercent).toBe(10);
      expect(resPreview.body.chargeAmountPaise).toBe(10000);
      expect(resPreview.body.hoursUntilEvent).toBeDefined();
    });

    it('POST /bookings/:id/cancel executes customer cancellation (FR-CAN-02)', async () => {
      const createRes = await request(app)
        .post('/bookings')
        .set(customerAuthHeaders)
        .send({
          vendorId: 'vnd_conformance_1',
          packageId: 'pkg_conformance_1',
          eventDate: '2027-11-20',
          custom_price: 1000,
        });

      const cancelBkgId = createRes.body.id;

      const res = await request(app)
        .post(`/bookings/${cancelBkgId}/cancel`)
        .set(customerAuthHeaders)
        .send({
          reason: 'Event rescheduled to next year',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED_BY_CUSTOMER');
    });

    it('POST /bookings/:id/dispute files a dispute (FR-PAY-06)', async () => {
      // Create and confirm a booking
      const createRes = await request(app)
        .post('/bookings')
        .set(customerAuthHeaders)
        .send({
          vendorId: 'vnd_conformance_1',
          packageId: 'pkg_conformance_1',
          eventDate: '2027-11-20',
          custom_price: 1000,
        });

      const disputeBkgId = createRes.body.id;

      // Accept and confirm booking before raising dispute
      await request(app).patch(`/bookings/${disputeBkgId}/accept`).set(vendorAuthHeaders);
      await request(app)
        .patch(`/internal/bookings/${disputeBkgId}/confirm-deposit`)
        .set('X-Internal-Key', 'dev-internal-key-123');

      const res = await request(app)
        .post(`/bookings/${disputeBkgId}/dispute`)
        .set(customerAuthHeaders)
        .send({
          reason: 'Vendor failed to provide requested dietary menu',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DISPUTED');
    });
  });
});
