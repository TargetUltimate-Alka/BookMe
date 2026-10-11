const request = require('supertest');
const app = require('../src/app');
const assert = require('assert');

async function runHealthTests() {
  console.log('Testing GET /health...');
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { status: 'UP', service: 'event-booking-service' });
  assert.ok(res.headers['x-request-id']);
  console.log('✔ GET /health passed!');

  console.log('Testing 404 handler...');
  const res404 = await request(app).get('/unknown-route');
  assert.strictEqual(res404.status, 404);
  assert.strictEqual(res404.body.error.code, 'NOT_FOUND');
  assert.ok(res404.body.error.requestId);
  console.log('✔ 404 handler passed!');

  console.log('Testing X-Request-Id propagation...');
  const customId = 'my-custom-id-123';
  const resCustom = await request(app).get('/health').set('X-Request-Id', customId);
  assert.strictEqual(resCustom.status, 200);
  assert.strictEqual(resCustom.headers['x-request-id'], customId);
  console.log('✔ X-Request-Id propagation passed!');

  console.log('All health & foundation tests passed successfully!');
}

if (typeof describe === 'undefined') {
  runHealthTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
} else {
  describe('Event Booking Service - Foundation & Health', () => {
    it('GET /health returns 200 and { status: "UP", service: "event-booking-service" }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'UP',
        service: 'event-booking-service',
      });
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('GET /unknown-route returns 404 in standard error JSON shape', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('propagates custom X-Request-Id from caller', async () => {
      const customId = 'test-custom-request-id-999';
      const res = await request(app).get('/health').set('X-Request-Id', customId);
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });
}

module.exports = { runHealthTests };
