const request = require('supertest');
const app = require('../src/app');

describe('BookMe Administration Service (admin-service)', () => {
  describe('Health Check', () => {
    it('should return 200 UP for /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.service).toBe('admin-service');
      expect(res.body).toHaveProperty('storageMode');
    });
  });

  describe('FR-ADM-01: Administrative Users & RBAC Sub-roles', () => {
    it('should list admin users with roles', async () => {
      const res = await request(app)
        .get('/admin/users')
        .set('X-User-Role', 'superAdmin');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);

      const superAdminUser = res.body.items.find((u) => u.roles.includes('superAdmin'));
      expect(superAdminUser).toBeDefined();
    });

    it('should filter admin users by specific role', async () => {
      const res = await request(app)
        .get('/admin/users?role=verifier')
        .set('X-User-Role', 'superAdmin');

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].roles).toContain('verifier');
    });

    it('should update user roles and enforce superAdmin authorization', async () => {
      const res = await request(app)
        .patch('/admin/users/usr_support_01/roles')
        .set('X-User-Role', 'superAdmin')
        .send({ roles: ['supportAgent', 'contentModerator'] });

      expect(res.status).toBe(200);
      expect(res.body.roles).toContain('contentModerator');
      expect(res.body.roles).toContain('supportAgent');
    });

    it('should reject role update if caller is not superAdmin (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/admin/users/usr_support_01/roles')
        .set('X-User-Role', 'contentModerator')
        .send({ roles: ['superAdmin'] });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('FR-ADM-02: Immutable Audit Log', () => {
    it('should query immutable audit logs with before/after state', async () => {
      const res = await request(app)
        .get('/admin/audit-logs')
        .set('X-User-Role', 'superAdmin');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);

      const entry = res.body.items[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('entity');
      expect(entry).toHaveProperty('timestamp');
    });

    it('should allow supportAgent and financeAdmin to query audit trail', async () => {
      const res = await request(app)
        .get('/admin/audit-logs?entity=User')
        .set('X-User-Role', 'financeAdmin');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
    });

    it('should create an audit log entry', async () => {
      const res = await request(app)
        .post('/admin/audit-logs')
        .set('X-User-Role', 'superAdmin')
        .send({
          action: 'DISPUTE_MANUAL_OVERRIDE',
          entity: 'Booking',
          entityId: 'bkg_123',
          beforeState: { status: 'DISPUTED' },
          afterState: { status: 'COMPLETED', resolution: 'Customer refund 50%' },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.action).toBe('DISPUTE_MANUAL_OVERRIDE');
      expect(res.body.entity).toBe('Booking');
    });
  });

  describe('FR-ADM-03 & SRS §2.3: Dynamic Configuration Parameters Editor', () => {
    it('should list all SRS §2.3 CONFIG parameters and defaults', async () => {
      const res = await request(app)
        .get('/admin/configs')
        .set('X-User-Role', 'superAdmin');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(15);

      const leadFee = res.body.find((c) => c.key === 'LEAD_FEE_PAISE');
      expect(leadFee).toBeDefined();
      expect(leadFee.value).toBe('2500');

      const depositPercent = res.body.find((c) => c.key === 'DEPOSIT_PERCENT');
      expect(depositPercent).toBeDefined();
      expect(depositPercent.value).toBe('40');

      const balancePercent = res.body.find((c) => c.key === 'BALANCE_PERCENT');
      expect(balancePercent).toBeDefined();
      expect(balancePercent.value).toBe('60');
    });

    it('should update a CONFIG parameter with mandatory changeReason', async () => {
      const res = await request(app)
        .patch('/admin/configs/LEAD_FEE_PAISE')
        .set('X-User-Role', 'superAdmin')
        .send({
          value: '3000',
          changeReason: 'Festival season revised lead fee benchmark.',
        });

      expect(res.status).toBe(200);
      expect(res.body.key).toBe('LEAD_FEE_PAISE');
      expect(res.body.value).toBe('3000');
    });

    it('should reject CONFIG update missing changeReason', async () => {
      const res = await request(app)
        .patch('/admin/configs/LEAD_FEE_PAISE')
        .set('X-User-Role', 'superAdmin')
        .send({ value: '3500' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return modification history for updated CONFIG parameter', async () => {
      const res = await request(app)
        .get('/admin/configs/LEAD_FEE_PAISE/history')
        .set('X-User-Role', 'superAdmin');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].changeReason).toBe('Festival season revised lead fee benchmark.');
    });
  });

  describe('FR-ADM-04: Vendor Enforcement Ladder', () => {
    it('should apply WARNING enforcement action with case notes', async () => {
      const res = await request(app)
        .post('/admin/vendors/vnd_sample_101/enforcement')
        .set('X-User-Role', 'superAdmin')
        .send({
          action: 'WARNING',
          reason: 'Initial off-platform contact sharing notice.',
          caseNotes: 'Customer flagged chat phone leakage.',
        });

      expect(res.status).toBe(200);
      expect(res.body.vendorId).toBe('vnd_sample_101');
      expect(res.body.action).toBe('WARNING');
      expect(res.body).toHaveProperty('appliedAt');
    });

    it('should apply SUSPENSION enforcement action', async () => {
      const res = await request(app)
        .post('/admin/vendors/vnd_sample_101/enforcement')
        .set('X-User-Role', 'supportAgent')
        .send({
          action: 'SUSPENSION',
          reason: 'Second strike off-platform transaction attempt.',
          caseNotes: 'Suspension for 14 calendar days per vendor agreement.',
        });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('SUSPENSION');
    });

    it('should reject invalid enforcement action', async () => {
      const res = await request(app)
        .post('/admin/vendors/vnd_sample_101/enforcement')
        .set('X-User-Role', 'superAdmin')
        .send({
          action: 'EXPULSION_INVALID',
          reason: 'Test reason',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ENFORCEMENT_ACTION');
    });

    it('should list all enforcement actions for a vendor', async () => {
      const res = await request(app)
        .get('/admin/vendors/vnd_sample_101/enforcements')
        .set('X-User-Role', 'superAdmin');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  describe('FR-VEN-02 & FR-REV-04: Moderation Queue', () => {
    it('should list items in the moderation queue', async () => {
      const res = await request(app)
        .get('/admin/moderation/queue')
        .set('X-User-Role', 'contentModerator');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should approve or reject moderation item with mandatory reason', async () => {
      const res = await request(app)
        .post('/admin/moderation/mod_queue_01/action')
        .set('X-User-Role', 'contentModerator')
        .send({
          decision: 'APPROVED',
          reason: 'Verified photo meets quality and watermarking standards.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');
      expect(res.body.moderatedBy).toBeDefined();
    });
  });
});
