const request = require('supertest');
const app = require('../src/app');
const inMemoryStore = require('../src/db/inMemoryStore');
const config = require('../src/config');
const jwt = require('jsonwebtoken');

describe('Auth Service Tests (contracts/auth-service.md compliance)', () => {
  beforeEach(() => {
    // Reset in-memory store for isolation
    inMemoryStore.reset();
  });

  describe('POST /api/auth/register', () => {
    it('1. Successfully registers a customer', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'customer',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^usr_/);
      expect(res.body.name).toBe('Jane Doe');
      expect(res.body.email).toBe('jane@example.com');
      expect(res.body.role).toBe('customer');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.password_hash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
    });

    it('2. Successfully registers a vendor', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Grand Caterer',
          email: 'caterer@example.com',
          password: 'secretpassword',
          role: 'vendor',
        });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('vendor');
      expect(res.body.name).toBe('Grand Caterer');
    });

    it('3. Rejects invalid registration data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'J',
          email: 'invalid-email',
          password: '123',
          role: 'customer',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('4. Rejects duplicate email with 409 Conflict', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'customer',
        });

      // Second registration with same email (case-insensitive)
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another Jane',
          email: 'JANE@example.com',
          password: 'differentpassword',
          role: 'customer',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('5. Rejects admin registration in V1 with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'supersecretadmin',
          role: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].field).toBe('role');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'customer',
        });
    });

    it('6. Successfully logs in and returns access token & refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.expiresIn).toBe(900);
      expect(res.body.user).toEqual({
        id: expect.stringMatching(/^usr_/),
        name: 'Jane Doe',
        role: 'customer',
      });

      // Verify JWT claims
      const decoded = jwt.verify(res.body.accessToken, config.jwtSecret);
      expect(decoded.sub).toBe(res.body.user.id);
      expect(decoded.role).toBe('customer');
      expect(decoded.exp - decoded.iat).toBe(900);
    });

    it('7. Returns 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('8. Returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'customer',
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'password123',
        });

      refreshToken = loginRes.body.refreshToken;
    });

    it('9. Issues new access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.expiresIn).toBe(900);
    });

    it('10. Rejects invalid refresh token with 401', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'completely_bogus_token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('Protected Endpoints (/me, /logout)', () => {
    let accessToken;
    let refreshToken;
    let userId;

    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'customer',
        });
      userId = reg.body.id;

      const login = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'password123',
        });
      accessToken = login.body.accessToken;
      refreshToken = login.body.refreshToken;
    });

    it('11. Returns 401 for unauthenticated request to /me', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_AUTH_TOKEN');
    });

    it('12. Returns 401 for expired or invalid access token', async () => {
      // Fake expired token
      const expiredToken = jwt.sign(
        { sub: userId, role: 'customer' },
        config.jwtSecret,
        { expiresIn: -10 }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('13. Successfully fetches user profile on GET /me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body.name).toBe('Jane Doe');
      expect(res.body.email).toBe('jane@example.com');
      expect(res.body.role).toBe('customer');
    });

    it('14. Successfully updates user name on PATCH /me', async () => {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Jane D. Doe' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Jane D. Doe');

      // Verify persistence via GET /me
      const checkRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(checkRes.body.name).toBe('Jane D. Doe');
    });

    it('15. Successfully logs out and revokes refresh token on POST /logout', async () => {
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(204);

      // Verify that using the revoked refresh token now fails with 401
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('Internal Service Endpoint (GET /api/internal/users/:id)', () => {
    let userId;

    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'vendor',
        });
      userId = reg.body.id;
    });

    it('16. Successfully returns internal user lookup with valid X-Internal-Key', async () => {
      const res = await request(app)
        .get(`/api/internal/users/${userId}`)
        .set('X-Internal-Key', config.internalApiKey);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: userId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'vendor',
      });
      expect(res.body.password_hash).toBeUndefined();
    });

    it('17. Rejects internal lookup without valid X-Internal-Key', async () => {
      const res = await request(app)
        .get(`/api/internal/users/${userId}`)
        .set('X-Internal-Key', 'wrong-key');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('18. Returns 404 for unknown user on internal lookup', async () => {
      const res = await request(app)
        .get('/api/internal/users/usr_unknown_999')
        .set('X-Internal-Key', config.internalApiKey);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
