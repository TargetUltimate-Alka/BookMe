// Integration tests against a real Postgres (auth_db), driven with supertest.
// Run with: npm test  (requires the auth-db container to be up, or a
// local Postgres reachable at DATABASE_URL — see README "Testing").
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

const uniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

afterAll(async () => {
  await db.pool.end();
});

describe('POST /auth/register', () => {
  test('registers a valid customer', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Test User',
      email: uniqueEmail(),
      phone: '9876543210',
      password: 'Password@123',
      role: 'CUSTOMER',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBeDefined();
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  test('rejects duplicate email', async () => {
    const email = uniqueEmail();
    const payload = { name: 'A', email, password: 'Password@123', role: 'CUSTOMER' };
    await request(app).post('/auth/register').send(payload);
    const res = await request(app).post('/auth/register').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_IN_USE');
  });

  test('rejects invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'Password@123', role: 'CUSTOMER' });
    expect(res.status).toBe(422);
  });

  test('rejects weak password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'A', email: uniqueEmail(), password: '123', role: 'CUSTOMER' });
    expect(res.status).toBe(422);
  });

  test('rejects missing fields', async () => {
    const res = await request(app).post('/auth/register').send({ email: uniqueEmail() });
    expect(res.status).toBe(422);
  });

  test('rejects self-registration as ADMIN', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'A', email: uniqueEmail(), password: 'Password@123', role: 'ADMIN' });
    expect(res.status).toBe(422); // caught by the validator's role whitelist first
  });
});

describe('POST /auth/login', () => {
  const email = uniqueEmail();
  const password = 'Password@123';

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ name: 'Login Test', email, password, role: 'CUSTOMER' });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email, password: 'WrongPass@123' });
    expect(res.status).toBe(401);
  });

  test('rejects unknown email', async () => {
    const res = await request(app).post('/auth/login').send({ email: uniqueEmail(), password });
    expect(res.status).toBe(401);
  });

  test('GET /auth/me rejects missing token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /auth/me works with valid token', async () => {
    const loginRes = await request(app).post('/auth/login').send({ email, password });
    const token = loginRes.body.data.accessToken;
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
  });
});
