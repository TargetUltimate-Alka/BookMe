const request = require('supertest');
const app = require('../src/app');
const inMemoryStore = require('../src/db/inMemoryStore');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

describe('FR-ONB-04 & FR-ONB-05: Mandatory Terms Acceptance', () => {
  let customerToken;
  let customerId;
  let vendorToken;
  let vendorId;

  beforeEach(async () => {
    inMemoryStore.reset();

    customerId = 'usr_cust_123';
    customerToken = jwt.sign({ sub: customerId, role: 'customer' }, config.jwtSecret, { expiresIn: 900 });

    vendorId = 'usr_vend_456';
    vendorToken = jwt.sign({ sub: vendorId, role: 'vendor' }, config.jwtSecret, { expiresIn: 900 });

    await inMemoryStore.insertUser({
      id: customerId,
      name: 'Customer One',
      phone_hash: 'cust_hash_1',
      phone_encrypted: 'cust_enc_1',
      password_hash: 'pwd_hash',
      role: 'customer',
      status: 'ACTIVE',
    });

    await inMemoryStore.insertUser({
      id: vendorId,
      name: 'Vendor One',
      phone_hash: 'vend_hash_1',
      phone_encrypted: 'vend_enc_1',
      password_hash: 'pwd_hash',
      role: 'vendor',
      status: 'ACTIVE',
    });
  });

  it('FR-ONB-04-T1: Successfully records CUSTOMER_DAMAGE_LIABILITY terms acceptance', async () => {
    const res = await request(app)
      .post('/v1/auth/agreements/accept')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        agreementType: 'CUSTOMER_DAMAGE_LIABILITY',
        version: '1.0.0',
      });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(true);
    expect(res.body.acceptedAt).toBeDefined();

    // Verify append-only record in store
    const records = await inMemoryStore.getAgreementAcceptances(customerId);
    expect(records.length).toBe(1);
    expect(records[0].agreement_type).toBe('CUSTOMER_DAMAGE_LIABILITY');
    expect(records[0].version).toBe('1.0.0');
    expect(records[0].ip_address).toBeDefined();
  });

  it('FR-ONB-05-T1: Successfully records VENDOR_SERVICE_AGREEMENT acceptance', async () => {
    const res = await request(app)
      .post('/v1/auth/agreements/accept')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        agreementType: 'VENDOR_SERVICE_AGREEMENT',
        version: '1.2.0',
      });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(true);
    expect(res.body.acceptedAt).toBeDefined();

    const records = await inMemoryStore.getAgreementAcceptances(vendorId);
    expect(records.length).toBe(1);
    expect(records[0].agreement_type).toBe('VENDOR_SERVICE_AGREEMENT');
    expect(records[0].version).toBe('1.2.0');
  });

  it('FR-ONB-04-T2: Rejects invalid agreement types with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/v1/auth/agreements/accept')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        agreementType: 'RANDOM_NON_EXISTENT_TYPE',
        version: '1.0.0',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('FR-ONB-04-T3: Returns accurate status via GET /v1/auth/agreements/status', async () => {
    // Initial status before acceptance
    const res1 = await request(app)
      .get('/v1/auth/agreements/status')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({
      damageLiabilityAccepted: false,
      vendorAgreementSigned: false,
      currentAgreementVersion: '1.0.0',
    });

    // Accept customer damage liability
    await request(app)
      .post('/v1/auth/agreements/accept')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        agreementType: 'CUSTOMER_DAMAGE_LIABILITY',
        version: '1.0.0',
      });

    // Check status again
    const res2 = await request(app)
      .get('/v1/auth/agreements/status')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.damageLiabilityAccepted).toBe(true);
    expect(res2.body.vendorAgreementSigned).toBe(false);
  });
});
