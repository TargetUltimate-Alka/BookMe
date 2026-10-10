const request = require('supertest');
const app = require('../../src/app');

describe('Event Module - Validation & Role Authorization Tests', () => {
  describe('POST /events', () => {
    it('returns 401 when unauthenticated and DEV_AUTH_BYPASS is disabled', async () => {
      // Send explicit empty user headers to test auth gate
      const res = await request(app)
        .post('/events')
        .set('X-User-Id', '')
        .set('X-Dev-User-Id', '')
        .send({
          name: 'My Party',
          event_type: 'Birthday',
          event_date: '2027-01-01',
          budget: 50000,
          guest_count: 50,
        });

      expect([401, 403]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 VALIDATION_ERROR when missing required fields', async () => {
      const res = await request(app)
        .post('/events')
        .set('X-User-Id', 'cust_123')
        .set('X-User-Role', 'customer')
        .send({
          name: 'Incomplete Event',
          // missing event_type, event_date, budget, guest_count
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('returns 400 VALIDATION_ERROR for invalid event_type enum', async () => {
      const res = await request(app)
        .post('/events')
        .set('X-User-Id', 'cust_123')
        .set('X-User-Role', 'customer')
        .send({
          name: 'Invalid Type Event',
          event_type: 'FakeType123',
          event_date: '2027-01-01',
          budget: 50000,
          guest_count: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 VALIDATION_ERROR when budget is <= 0', async () => {
      const res = await request(app)
        .post('/events')
        .set('X-User-Id', 'cust_123')
        .set('X-User-Role', 'customer')
        .send({
          name: 'Zero Budget Event',
          event_type: 'Birthday',
          event_date: '2027-01-01',
          budget: 0,
          guest_count: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 VALIDATION_ERROR when guest_count is < 1', async () => {
      const res = await request(app)
        .post('/events')
        .set('X-User-Id', 'cust_123')
        .set('X-User-Role', 'customer')
        .send({
          name: 'Zero Guests Event',
          event_type: 'Birthday',
          event_date: '2027-01-01',
          budget: 50000,
          guest_count: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /events/:id/budget', () => {
    it('returns 400 VALIDATION_ERROR for invalid budget body format', async () => {
      const res = await request(app)
        .put('/events/b0c11223-1111-2222-3333-444455556666/budget')
        .set('X-User-Id', 'cust_123')
        .set('X-User-Role', 'customer')
        .send({
          // missing categories array
          invalidField: 123,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /events/:id/checklist', () => {
    it('returns 400 VALIDATION_ERROR when task is missing or empty', async () => {
      const res = await request(app)
        .post('/events/b0c11223-1111-2222-3333-444455556666/checklist')
        .set('X-User-Id', 'cust_123')
        .set('X-User-Role', 'customer')
        .send({
          task: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
