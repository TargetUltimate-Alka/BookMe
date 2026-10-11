const request = require('supertest');
const app = require('../../src/app');
const bookingService = require('../../src/modules/booking/services/bookingService');
const adminBookingService = require('../../src/modules/booking/services/adminBookingService');

jest.mock('../../src/modules/booking/services/bookingService');
jest.mock('../../src/modules/booking/services/adminBookingService');

describe('Booking Module - Full Lifecycle & Admin Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customerHeaders = {
    'X-User-Id': 'usr_cust_1',
    'X-User-Role': 'customer',
  };

  const vendorHeaders = {
    'X-User-Id': 'usr_vendor_1',
    'X-User-Role': 'vendor',
  };

  const adminHeaders = {
    'X-User-Id': 'usr_admin_1',
    'X-User-Role': 'admin',
  };

  describe('POST /bookings', () => {
    it('creates a pending booking (201 Created)', async () => {
      const mockBooking = {
        id: 'bkg_100',
        event_id: 'evt_123',
        customer_id: 'usr_cust_1',
        vendor_id: 'vnd_456',
        service_id: 'svc_789',
        package_id: 'pkg_111',
        category: 'Catering',
        booking_date: '2027-05-20',
        vendor_name_snapshot: 'Sunset Catering',
        package_name_snapshot: 'Gold Buffet Package',
        price_snapshot: 120000,
        status: 'PENDING',
      };

      bookingService.createBooking.mockResolvedValueOnce(mockBooking);

      const res = await request(app)
        .post('/bookings')
        .set(customerHeaders)
        .send({
          event_id: 'evt_123',
          vendor_id: 'vnd_456',
          service_id: 'svc_789',
          package_id: 'pkg_111',
          category: 'Catering',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('bkg_100');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.price_snapshot).toBe(120000);
      expect(bookingService.createBooking).toHaveBeenCalledWith('usr_cust_1', expect.any(Object));
    });

    it('returns 400 for missing mandatory parameters', async () => {
      const res = await request(app)
        .post('/bookings')
        .set(customerHeaders)
        .send({
          event_id: 'evt_123',
          // missing vendor_id, service_id, package_id
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /bookings and GET /bookings/vendor', () => {
    it('lists customer bookings (200 OK)', async () => {
      bookingService.listCustomerBookings.mockResolvedValueOnce({
        data: [{ id: 'bkg_100', status: 'PENDING' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const res = await request(app).get('/bookings').set(customerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('lists vendor bookings (200 OK)', async () => {
      bookingService.listVendorBookings.mockResolvedValueOnce({
        data: [{ id: 'bkg_100', status: 'PENDING' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const res = await request(app).get('/bookings/vendor').set(vendorHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('PATCH Lifecycle Transitions', () => {
    it('vendor accepts booking (200 OK)', async () => {
      bookingService.acceptBooking.mockResolvedValueOnce({
        id: 'bkg_100',
        status: 'ACCEPTED',
        payment_due_at: '2026-10-12T12:00:00Z',
      });

      const res = await request(app)
        .patch('/bookings/bkg_100/accept')
        .set(vendorHeaders);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');
    });

    it('vendor rejects booking with reason (200 OK)', async () => {
      bookingService.rejectBooking.mockResolvedValueOnce({
        id: 'bkg_100',
        status: 'REJECTED',
        rejection_reason: 'Booked privately',
      });

      const res = await request(app)
        .patch('/bookings/bkg_100/reject')
        .set(vendorHeaders)
        .send({ reason: 'Booked privately' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REJECTED');
    });

    it('cancels booking with reason (200 OK)', async () => {
      bookingService.cancelBooking.mockResolvedValueOnce({
        id: 'bkg_100',
        status: 'CANCELLED',
        cancellation_reason: 'Change of schedule',
      });

      const res = await request(app)
        .patch('/bookings/bkg_100/cancel')
        .set(customerHeaders)
        .send({ reason: 'Change of schedule' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('vendor completes confirmed booking after event date (200 OK)', async () => {
      bookingService.completeBooking.mockResolvedValueOnce({
        id: 'bkg_100',
        status: 'COMPLETED',
      });

      const res = await request(app)
        .patch('/bookings/bkg_100/complete')
        .set(vendorHeaders);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
    });
  });

  describe('Admin Endpoints', () => {
    it('GET /admin/bookings returns all platform bookings (200 OK)', async () => {
      adminBookingService.listAllBookings.mockResolvedValueOnce({
        data: [{ id: 'bkg_100', status: 'CONFIRMED' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      const res = await request(app).get('/admin/bookings').set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('GET /admin/stats returns platform statistics (200 OK)', async () => {
      adminBookingService.getStats.mockResolvedValueOnce({
        total_bookings: 100,
        by_status: { CONFIRMED: 75, PENDING: 25 },
        total_gross_volume: 5000000,
      });

      const res = await request(app).get('/admin/stats').set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.total_bookings).toBe(100);
      expect(res.body.total_gross_volume).toBe(5000000);
    });
  });

  describe('Internal Endpoint (/internal/bookings/:id)', () => {
    it('rejects without X-Internal-Key (401 Unauthorized)', async () => {
      const res = await request(app).get('/internal/bookings/bkg_100');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns booking snapshot with valid X-Internal-Key (200 OK)', async () => {
      bookingService.getInternalBooking.mockResolvedValueOnce({
        id: 'bkg_100',
        event_id: 'evt_123',
        customer_id: 'usr_cust_1',
        amount: 120000,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .get('/internal/bookings/bkg_100')
        .set('X-Internal-Key', 'dev-internal-key-123');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('bkg_100');
      expect(res.body.amount).toBe(120000);
    });
  });
});
