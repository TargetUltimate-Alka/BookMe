const request = require('supertest');
const app = require('../src/app');

describe('Payment & Feedback Service API', () => {
  let createdPaymentId;
  const testBookingId = `bkg_test_${Date.now()}`;
  const testVendorId = `vnd_test_${Date.now()}`;

  describe('Health check', () => {
    it('should return 200 OK for /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('payment-feedback-service');
    });
  });

  describe('Payments Module', () => {
    it('should initiate payment and return 201 with pending status and authChallenge', async () => {
      const res = await request(app)
        .post('/api/payments')
        .send({
          bookingId: testBookingId,
          amount: 50000,
          method: 'card',
          paymentDetails: {
            cardNumber: '4111222233334242',
            cardholderName: 'Alka Sharma',
            cardBrand: 'Visa',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.bookingId).toBe(testBookingId);
      expect(res.body.amount).toBe(50000);
      expect(res.body.status).toBe('pending');
      expect(res.body).toHaveProperty('gatewayRef');
      expect(res.body).toHaveProperty('authChallenge');
      expect(res.body.authChallenge.testOtp).toBe('123456');

      createdPaymentId = res.body.id;
    });

    it('should reject authentication with wrong OTP', async () => {
      const res = await request(app)
        .post(`/api/payments/${createdPaymentId}/authenticate`)
        .send({ otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AUTH_VERIFICATION_FAILED');
    });

    it('should authenticate payment with valid OTP (123456) and transition to success', async () => {
      const res = await request(app)
        .post(`/api/payments/${createdPaymentId}/authenticate`)
        .send({ otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdPaymentId);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('receiptNumber');
    });

    it('should retrieve payment by ID', async () => {
      const res = await request(app).get(`/api/payments/${createdPaymentId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdPaymentId);
      expect(res.body.status).toBe('success');
      expect(res.body.amount).toBe(50000);
    });

    it('should retrieve payments by booking ID', async () => {
      const res = await request(app).get(`/api/payments/booking/${testBookingId}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].bookingId).toBe(testBookingId);
    });

    it('should handle gateway webhook', async () => {
      const res = await request(app)
        .post(`/api/payments/${createdPaymentId}/webhook`)
        .send({ status: 'success', gatewayRef: 'gateway_verified_123' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Payouts Module', () => {
    it('should create vendor payout', async () => {
      const res = await request(app)
        .post('/api/payouts')
        .send({
          vendorId: testVendorId,
          bookingId: testBookingId,
          amount: 45000,
        });

      expect(res.status).toBe(201);
      expect(res.body.vendorId).toBe(testVendorId);
      expect(res.body.amount).toBe(45000);
      expect(res.body.status).toBe('processed');
    });

    it('should list payouts for vendor', async () => {
      const res = await request(app).get(`/api/payouts/${testVendorId}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].amount).toBe(45000);
    });
  });

  describe('Reviews Module', () => {
    it('should create review for a booking', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: testBookingId,
          vendorId: testVendorId,
          rating: 5,
          comment: 'Outstanding catering and service!',
        });

      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(5);
      expect(res.body.comment).toBe('Outstanding catering and service!');
    });

    it('should reject duplicate review for same booking with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          bookingId: testBookingId,
          vendorId: testVendorId,
          rating: 4,
          comment: 'Another review attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_REVIEWED');
    });

    it('should list reviews for vendor', async () => {
      const res = await request(app).get(`/api/reviews?vendorId=${testVendorId}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].rating).toBe(5);
    });
  });

  describe('Complaints Module', () => {
    let complaintId;

    it('should create a customer complaint', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .send({
          bookingId: testBookingId,
          subject: 'Late equipment setup',
          description: 'Sound equipment was delivered 1 hour after scheduled time.',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('open');
      expect(res.body.subject).toBe('Late equipment setup');
      complaintId = res.body.id;
    });

    it('should list open complaints', async () => {
      const res = await request(app).get('/api/complaints?status=open');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.find((c) => c.id === complaintId)).toBeDefined();
    });

    it('should retrieve complaint by ID', async () => {
      const res = await request(app).get(`/api/complaints/${complaintId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(complaintId);
      expect(res.body.subject).toBe('Late equipment setup');
    });

    it('should update complaint status to resolved', async () => {
      const res = await request(app)
        .patch(`/api/complaints/${complaintId}/status`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('resolved');
    });
  });
});
