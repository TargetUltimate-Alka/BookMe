const request = require('supertest');
const app = require('../src/app');
const inMemoryStore = require('../src/db/inMemoryStore');
const config = require('../src/config');
const jwt = require('jsonwebtoken');
const { defaultSmsSender } = require('../src/services/smsSender');
const { hashPhone, decrypt } = require('../src/services/encryptionService');

describe('FR-ONB-01, FR-ONB-02 & FR-ADM-01: Authentication, Token & Role Lifecycle', () => {
  beforeEach(() => {
    inMemoryStore.reset();
    defaultSmsSender.clear();
  });

  const validPhone = '+919876543210';
  const vendorPhone = '+919876543211';

  async function getVerificationToken(phone) {
    await request(app).post('/v1/auth/otp/send').send({ phone });
    const messages = defaultSmsSender.getSentMessages();
    const sentOtp = messages[messages.length - 1].otp;
    const res = await request(app).post('/v1/auth/otp/verify').send({ phone, otp: sentOtp });
    return res.body.verificationToken;
  }

  describe('POST /v1/auth/register', () => {
    it('FR-ONB-01-T10: Successfully registers customer with valid phone & verificationToken', async () => {
      const verificationToken = await getVerificationToken(validPhone);

      const res = await request(app)
        .post('/v1/auth/register')
        .send({
          phone: validPhone,
          verificationToken,
          name: 'Priya Sharma',
          email: 'priya@example.com',
          password: 'SecurePassword123!',
          role: 'customer',
          acceptLiabilityTerms: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(res.body.name).toBe('Priya Sharma');
      expect(res.body.role).toBe('customer');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.expiresIn).toBe(config.jwtExpiresIn);

      // Verify JWT claims
      const decoded = jwt.verify(res.body.accessToken, config.jwtSecret);
      expect(decoded.sub).toBe(res.body.id);
      expect(decoded.role).toBe('customer');

      // Verify phone is encrypted at rest
      const user = await inMemoryStore.findUserById(res.body.id);
      expect(user.phone_encrypted).not.toBe(validPhone);
      expect(decrypt(user.phone_encrypted)).toBe(validPhone);
      expect(user.phone_hash).toBe(hashPhone(validPhone));
    });

    it('FR-ONB-02-T1: Successfully registers vendor and records account', async () => {
      const verificationToken = await getVerificationToken(vendorPhone);

      const res = await request(app)
        .post('/v1/auth/register')
        .send({
          phone: vendorPhone,
          verificationToken,
          name: 'Grand Royal Banquet',
          email: 'banquet@example.com',
          password: 'VendorSecure123!',
          role: 'vendor',
        });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('vendor');
      expect(res.body.name).toBe('Grand Royal Banquet');
    });

    it('FR-ADM-01-T1: Rejects registration without valid verificationToken with 400', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send({
          phone: validPhone,
          verificationToken: 'tok_fake_token',
          name: 'Fake Token User',
          password: 'SecurePassword123!',
          role: 'customer',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('FR-ONB-01-T11: Rejects passwords shorter than 8 characters', async () => {
      const verificationToken = await getVerificationToken(validPhone);

      const res = await request(app)
        .post('/v1/auth/register')
        .send({
          phone: validPhone,
          verificationToken,
          name: 'Short Pwd User',
          password: 'short',
          role: 'customer',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('FR-ONB-01-T12: Rejects duplicate phone registration with 409 CONFLICT', async () => {
      const tok1 = await getVerificationToken(validPhone);
      await request(app).post('/v1/auth/register').send({
        phone: validPhone,
        verificationToken: tok1,
        name: 'First User',
        password: 'SecurePassword123!',
        role: 'customer',
      });

      // Clear cooldown to get another verification token
      const pHash = hashPhone(validPhone);
      const otpRec = await inMemoryStore.getLatestOtp(pHash);
      otpRec.cooldown_until = new Date(Date.now() - 1000).toISOString();

      const tok2 = await getVerificationToken(validPhone);
      const res = await request(app).post('/v1/auth/register').send({
        phone: validPhone,
        verificationToken: tok2,
        name: 'Second User',
        password: 'AnotherPassword123!',
        role: 'customer',
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      const tok = await getVerificationToken(validPhone);
      await request(app).post('/v1/auth/register').send({
        phone: validPhone,
        verificationToken: tok,
        name: 'Login Test User',
        email: 'login@example.com',
        password: 'CorrectPassword123!',
        role: 'customer',
      });
    });

    it('FR-ONB-01-T13: Successfully logs in with phone and password', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({
          phone: validPhone,
          password: 'CorrectPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.expiresIn).toBe(config.jwtExpiresIn);
      expect(res.body.user.role).toBe('customer');
    });

    it('FR-ONB-01-T14: Anti-enumeration: returns identical 401 for unregistered phone vs incorrect password', async () => {
      const resWrongPwd = await request(app)
        .post('/v1/auth/login')
        .send({ phone: validPhone, password: 'WrongPassword999!' });

      const resUnknownPhone = await request(app)
        .post('/v1/auth/login')
        .send({ phone: '+919999999999', password: 'AnyPassword123!' });

      expect(resWrongPwd.status).toBe(401);
      expect(resUnknownPhone.status).toBe(401);
      expect(resWrongPwd.body.code).toBe('UNAUTHORIZED');
      expect(resUnknownPhone.body.code).toBe('UNAUTHORIZED');
      expect(resWrongPwd.body.message).toBe('Invalid credentials');
      expect(resUnknownPhone.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /v1/auth/refresh & Token Reuse Detection', () => {
    let initialRefreshToken;
    let userId;

    beforeEach(async () => {
      const tok = await getVerificationToken(validPhone);
      const reg = await request(app).post('/v1/auth/register').send({
        phone: validPhone,
        verificationToken: tok,
        name: 'Token User',
        password: 'Password123!',
        role: 'customer',
      });
      initialRefreshToken = reg.body.refreshToken;
      userId = reg.body.id;
    });

    it('FR-ONB-01-T15: Rotates refresh token and returns new access token', async () => {
      const res = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.expiresIn).toBe(config.jwtExpiresIn);

      const decoded = jwt.verify(res.body.accessToken, config.jwtSecret);
      expect(decoded.sub).toBe(userId);
    });

    it('FR-ONB-01-T16: Token reuse detection revokes entire token family', async () => {
      // First refresh succeeds (revokes initialRefreshToken)
      await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      // Attacker replays initialRefreshToken (REUSE DETECTED!)
      const replayRes = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.code).toBe('UNAUTHORIZED');
      expect(replayRes.body.message).toMatch(/reuse detected/i);
    });
  });

  describe('Session & Profile Endpoints (/me, /logout, /internal)', () => {
    let accessToken;
    let refreshToken;
    let userId;

    beforeEach(async () => {
      const tok = await getVerificationToken(validPhone);
      const reg = await request(app).post('/v1/auth/register').send({
        phone: validPhone,
        verificationToken: tok,
        name: 'Profile User',
        email: 'profile@example.com',
        password: 'Password123!',
        role: 'customer',
      });
      accessToken = reg.body.accessToken;
      refreshToken = reg.body.refreshToken;
      userId = reg.body.id;
    });

    it('FR-ONB-01-T17: Successfully logs out and revokes refresh tokens (204 No Content)', async () => {
      const res = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(204);

      // Attempting to use refreshToken after logout fails
      const refreshRes = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it('FR-ONB-01-T18: GET /v1/auth/me returns profile with decrypted phone number', async () => {
      const res = await request(app)
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body.phone).toBe(validPhone); // Decrypted!
      expect(res.body.email).toBe('profile@example.com');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.role).toBe('customer');
    });

    it('FR-ONB-01-T19: PATCH /v1/auth/me updates name and email', async () => {
      const res = await request(app)
        .patch('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
          email: 'newemail@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.email).toBe('newemail@example.com');
    });

    it('FR-ONB-01-T20: GET /v1/internal/users/:id requires X-Internal-Key and returns decrypted phone', async () => {
      // 1. Without key fails with 403
      const resNoKey = await request(app).get(`/v1/internal/users/${userId}`);
      expect(resNoKey.status).toBe(403);
      expect(resNoKey.body.code).toBe('FORBIDDEN');

      // 2. With key succeeds
      const resWithKey = await request(app)
        .get(`/v1/internal/users/${userId}`)
        .set('X-Internal-Key', config.internalApiKey);

      expect(resWithKey.status).toBe(200);
      expect(resWithKey.body.id).toBe(userId);
      expect(resWithKey.body.phone).toBe(validPhone);
      expect(resWithKey.body.role).toBe('customer');
    });
  });
});
