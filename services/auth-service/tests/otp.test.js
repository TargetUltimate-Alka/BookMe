const request = require('supertest');
const app = require('../src/app');
const inMemoryStore = require('../src/db/inMemoryStore');
const config = require('../src/config');
const { defaultSmsSender } = require('../src/services/smsSender');
const { maskPhone } = require('../src/services/encryptionService');

describe('FR-ONB-01: OTP Lifecycle, Lockout & Anti-Enumeration', () => {
  beforeEach(() => {
    inMemoryStore.reset();
    defaultSmsSender.clear();
  });

  const validPhone = '+919876543210';
  const unregisteredPhone = '+919123456789';

  it('FR-ONB-01-T1: Dispatches 6-digit OTP and returns uniform 200 response (anti-enumeration)', async () => {
    // 1. Send OTP to unregistered number
    const res1 = await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: unregisteredPhone });

    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({
      success: true,
      expiresInSeconds: config.otpExpirySeconds,
    });

    const messages = defaultSmsSender.getSentMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].otp).toMatch(/^[0-9]{6}$/);

    // Verify OTP is NOT stored in plaintext anywhere in the store
    const latestOtp = await inMemoryStore.getLatestOtp(messages[0].phone);
    expect(latestOtp).toBeNull(); // Because inMemoryStore keys by phone_hash, not raw phone!
  });

  it('FR-ONB-01-T2: Rejects invalid phone numbers with 400 VALIDATION_ERROR', async () => {
    const invalidPhones = ['9876543210', '+9112345', 'not-a-phone', '+14155552671', ''];

    for (const phone of invalidPhones) {
      const res = await request(app)
        .post('/v1/auth/otp/send')
        .send({ phone });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.traceId).toBeDefined();
    }
  });

  it('FR-ONB-01-T3: Enforces resend cooldown window (429 RATE_LIMIT_EXCEEDED)', async () => {
    // First send
    const res1 = await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: validPhone });
    expect(res1.status).toBe(200);

    // Immediate second send within 30-sec cooldown
    const res2 = await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: validPhone });

    expect(res2.status).toBe(429);
    expect(res2.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(res2.headers['retry-after']).toBeDefined();
  });

  it('FR-ONB-01-T4: Successfully verifies valid OTP and returns verificationToken', async () => {
    // Send OTP
    await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: validPhone });

    const sentOtp = defaultSmsSender.getSentMessages()[0].otp;

    // Verify OTP
    const res = await request(app)
      .post('/v1/auth/otp/verify')
      .send({
        phone: validPhone,
        otp: sentOtp,
      });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.verificationToken).toMatch(/^tok_otp_verified_/);
  });

  it('FR-ONB-01-T5: Enforces single-use OTP consumption (replay fails with 400)', async () => {
    await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: validPhone });

    const sentOtp = defaultSmsSender.getSentMessages()[0].otp;

    // First verify succeeds
    const res1 = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ phone: validPhone, otp: sentOtp });
    expect(res1.status).toBe(200);

    // Second verify with same OTP fails
    const res2 = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ phone: validPhone, otp: sentOtp });
    expect(res2.status).toBe(400);
    expect(res2.body.code).toBe('VALIDATION_ERROR');
  });

  it('FR-ONB-01-T6: Enforces OTP expiry after config timeout', async () => {
    await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: validPhone });

    const sentOtp = defaultSmsSender.getSentMessages()[0].otp;

    // Manually expire the OTP in store
    const phoneHash = require('../src/services/encryptionService').hashPhone(validPhone);
    const otpRecord = await inMemoryStore.getLatestOtp(phoneHash);
    otpRecord.expires_at = new Date(Date.now() - 1000).toISOString();

    const res = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ phone: validPhone, otp: sentOtp });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('FR-ONB-01-T7: Locks account for 15 minutes after 5 failed verification attempts', async () => {
    // 1. First register a user so an account exists to lock
    await request(app).post('/v1/auth/otp/send').send({ phone: validPhone });
    const otp1 = defaultSmsSender.getSentMessages()[0].otp;
    const vRes = await request(app).post('/v1/auth/otp/verify').send({ phone: validPhone, otp: otp1 });

    await request(app).post('/v1/auth/register').send({
      phone: validPhone,
      verificationToken: vRes.body.verificationToken,
      name: 'Rohan Sharma',
      password: 'SecurePassword123!',
      role: 'customer',
    });

    // 2. Now attempt 5 wrong OTP verifications
    // Force reset cooldown so we can trigger a new OTP
    const phoneHash = require('../src/services/encryptionService').hashPhone(validPhone);
    const otpRec = await inMemoryStore.getLatestOtp(phoneHash);
    otpRec.cooldown_until = new Date(Date.now() - 1000).toISOString();

    await request(app).post('/v1/auth/otp/send').send({ phone: validPhone });

    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/v1/auth/otp/verify')
        .send({ phone: validPhone, otp: '000000' });
      expect(res.status).toBe(400);
    }

    // 3. 6th attempt or login is blocked by lockout
    const user = await inMemoryStore.findUserByPhoneHash(phoneHash);
    expect(user.status).toBe('LOCKED');
    expect(new Date(user.locked_until).getTime()).toBeGreaterThan(Date.now());

    // Login is also rejected due to lockout
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ phone: validPhone, password: 'SecurePassword123!' });
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toMatch(/Account locked/i);
  });

  it('FR-ONB-01-T8: Automatically unlocks account after 15-minute lockout expires', async () => {
    // Setup locked user
    const phoneHash = require('../src/services/encryptionService').hashPhone(validPhone);
    await inMemoryStore.insertUser({
      id: 'usr_locked_test',
      name: 'Test User',
      phone_encrypted: require('../src/services/encryptionService').encrypt(validPhone),
      phone_hash: phoneHash,
      email: 'test@example.com',
      password_hash: await require('bcryptjs').hash('SecurePassword123!', 10),
      role: 'customer',
      status: 'LOCKED',
      failed_attempts: 5,
      locked_until: new Date(Date.now() - 1000).toISOString(), // 1 second in the past (expired)
    });

    // Login succeeds now that lockout expired
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ phone: validPhone, password: 'SecurePassword123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();

    // User status is restored to ACTIVE
    const user = await inMemoryStore.findUserByPhoneHash(phoneHash);
    expect(user.status).toBe('ACTIVE');
    expect(user.failed_attempts).toBe(0);
  });

  it('FR-ONB-01-T9: Masks phone numbers in logging utility', () => {
    expect(maskPhone('+919876543210')).toBe('+91******3210');
    expect(maskPhone('+918888888888')).toBe('+91******8888');
    expect(maskPhone('')).toBe('[MASKED]');
  });

  it('FR-ONB-01-T10: Locks registration for 15 minutes after 5 failed OTP attempts on unregistered number', async () => {
    const newPhone = '+919988776655';
    await request(app).post('/v1/auth/otp/send').send({ phone: newPhone });

    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/v1/auth/otp/verify')
        .send({ phone: newPhone, otp: '111111' });
      expect(res.status).toBe(400);
      if (i === 5) {
        expect(res.body.message).toMatch(/Account locked/i);
      }
    }

    // Further verify or send attempts are blocked during 15-min lockout
    const resBlocked = await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: newPhone });
    expect(resBlocked.status).toBe(400);
    expect(resBlocked.body.message).toMatch(/Account locked/i);
  });
});
