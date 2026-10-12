const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const request = require('supertest');
const app = require('../src/app');
const inMemoryStore = require('../src/db/inMemoryStore');
const config = require('../src/config');
const { defaultSmsSender } = require('../src/services/smsSender');

describe('OpenAPI Contract Conformance Suite (identity.yaml & common.yaml)', () => {
  let identityDoc;
  let commonDoc;

  beforeAll(() => {
    const identityPath = path.resolve(__dirname, '../../../contracts/openapi/identity.yaml');
    const commonPath = path.resolve(__dirname, '../../../contracts/openapi/common.yaml');

    identityDoc = yaml.load(fs.readFileSync(identityPath, 'utf8'));
    commonDoc = yaml.load(fs.readFileSync(commonPath, 'utf8'));
  });

  beforeEach(() => {
    inMemoryStore.reset();
    defaultSmsSender.clear();
  });

  const testPhone = '+919876543210';

  it('Validates POST /v1/auth/otp/send 200 response against schema', async () => {
    const res = await request(app)
      .post('/v1/auth/otp/send')
      .send({ phone: testPhone });

    expect(res.status).toBe(200);

    const schema = identityDoc.paths['/auth/otp/send'].post.responses['200'].content['application/json'].schema;
    const requiredProps = Object.keys(schema.properties);

    expect(typeof res.body.success).toBe('boolean');
    expect(typeof res.body.expiresInSeconds).toBe('number');
    expect(Object.keys(res.body).sort()).toEqual(requiredProps.sort());
  });

  it('Validates POST /v1/auth/otp/verify 200 response against schema', async () => {
    await request(app).post('/v1/auth/otp/send').send({ phone: testPhone });
    const otp = defaultSmsSender.getSentMessages()[0].otp;

    const res = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ phone: testPhone, otp });

    expect(res.status).toBe(200);

    const schema = identityDoc.paths['/auth/otp/verify'].post.responses['200'].content['application/json'].schema;
    const requiredProps = Object.keys(schema.properties);

    expect(typeof res.body.verified).toBe('boolean');
    expect(typeof res.body.verificationToken).toBe('string');
    expect(Object.keys(res.body).sort()).toEqual(requiredProps.sort());
  });

  it('Validates POST /v1/auth/register 201 response against schema', async () => {
    await request(app).post('/v1/auth/otp/send').send({ phone: testPhone });
    const otp = defaultSmsSender.getSentMessages()[0].otp;
    const vRes = await request(app).post('/v1/auth/otp/verify').send({ phone: testPhone, otp });

    const res = await request(app)
      .post('/v1/auth/register')
      .send({
        phone: testPhone,
        verificationToken: vRes.body.verificationToken,
        name: 'Aarav Patel',
        email: 'aarav@example.com',
        password: 'SecureP@ssw0rd!',
        role: 'customer',
        acceptLiabilityTerms: true,
      });

    expect(res.status).toBe(201);

    const schema = identityDoc.paths['/auth/register'].post.responses['201'].content['application/json'].schema;
    const expectedKeys = Object.keys(schema.properties);

    expect(Object.keys(res.body).sort()).toEqual(expectedKeys.sort());
    expect(res.body.role).toBe('customer');
  });

  it('Validates POST /v1/auth/login 200 response against schema', async () => {
    await request(app).post('/v1/auth/otp/send').send({ phone: testPhone });
    const otp = defaultSmsSender.getSentMessages()[0].otp;
    const vRes = await request(app).post('/v1/auth/otp/verify').send({ phone: testPhone, otp });

    await request(app).post('/v1/auth/register').send({
      phone: testPhone,
      verificationToken: vRes.body.verificationToken,
      name: 'Aarav Patel',
      password: 'SecureP@ssw0rd!',
      role: 'customer',
    });

    const res = await request(app)
      .post('/v1/auth/login')
      .send({
        phone: testPhone,
        password: 'SecureP@ssw0rd!',
      });

    expect(res.status).toBe(200);

    const schema = identityDoc.paths['/auth/login'].post.responses['200'].content['application/json'].schema;
    const expectedKeys = Object.keys(schema.properties);

    expect(Object.keys(res.body).sort()).toEqual(expectedKeys.sort());
    expect(Object.keys(res.body.user).sort()).toEqual(['id', 'name', 'role'].sort());
  });

  it('Validates POST /v1/auth/refresh 200 response against schema', async () => {
    await request(app).post('/v1/auth/otp/send').send({ phone: testPhone });
    const otp = defaultSmsSender.getSentMessages()[0].otp;
    const vRes = await request(app).post('/v1/auth/otp/verify').send({ phone: testPhone, otp });

    const reg = await request(app).post('/v1/auth/register').send({
      phone: testPhone,
      verificationToken: vRes.body.verificationToken,
      name: 'Aarav Patel',
      password: 'SecureP@ssw0rd!',
      role: 'customer',
    });

    const res = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken });

    expect(res.status).toBe(200);

    const schema = identityDoc.paths['/auth/refresh'].post.responses['200'].content['application/json'].schema;
    const expectedKeys = Object.keys(schema.properties);

    expect(Object.keys(res.body).sort()).toEqual(expectedKeys.sort());
  });

  it('Validates ErrorResponse schema conforms to common.yaml ErrorResponse on all 4xx errors', async () => {
    // 400 Validation Error
    const res400 = await request(app).post('/v1/auth/otp/send').send({ phone: 'bad-phone' });
    expect(res400.status).toBe(400);

    const errSchema = commonDoc.components.schemas.ErrorResponse;
    const expectedErrorKeys = Object.keys(errSchema.properties);

    expect(Object.keys(res400.body).sort()).toEqual(expectedErrorKeys.sort());
    expect(commonDoc.components.schemas.ErrorCode.enum).toContain(res400.body.code);
    expect(typeof res400.body.message).toBe('string');
    expect(Array.isArray(res400.body.details)).toBe(true);
    expect(typeof res400.body.traceId).toBe('string');
  });

  it('Validates GET /v1/auth/me 200 response against schema', async () => {
    await request(app).post('/v1/auth/otp/send').send({ phone: testPhone });
    const otp = defaultSmsSender.getSentMessages()[0].otp;
    const vRes = await request(app).post('/v1/auth/otp/verify').send({ phone: testPhone, otp });

    const reg = await request(app).post('/v1/auth/register').send({
      phone: testPhone,
      verificationToken: vRes.body.verificationToken,
      name: 'Aarav Patel',
      email: 'aarav@example.com',
      password: 'SecureP@ssw0rd!',
      role: 'customer',
    });

    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(200);

    const schema = identityDoc.paths['/auth/me'].get.responses['200'].content['application/json'].schema;
    const expectedKeys = Object.keys(schema.properties);

    expect(Object.keys(res.body).sort()).toEqual(expectedKeys.sort());
    expect(res.body.phone).toBe(testPhone);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('Validates GET /v1/internal/users/:id 200 response against schema', async () => {
    await request(app).post('/v1/auth/otp/send').send({ phone: testPhone });
    const otp = defaultSmsSender.getSentMessages()[0].otp;
    const vRes = await request(app).post('/v1/auth/otp/verify').send({ phone: testPhone, otp });

    const reg = await request(app).post('/v1/auth/register').send({
      phone: testPhone,
      verificationToken: vRes.body.verificationToken,
      name: 'Aarav Patel',
      email: 'aarav@example.com',
      password: 'SecureP@ssw0rd!',
      role: 'customer',
    });

    const res = await request(app)
      .get(`/v1/internal/users/${reg.body.id}`)
      .set('X-Internal-Key', config.internalApiKey);

    expect(res.status).toBe(200);

    const schema = identityDoc.paths['/internal/users/{id}'].get.responses['200'].content['application/json'].schema;
    const expectedKeys = Object.keys(schema.properties);

    expect(Object.keys(res.body).sort()).toEqual(expectedKeys.sort());
    expect(res.body.phone).toBe(testPhone);
  });
});
