const initialConfigs = [
  {
    key: 'QUALIFYING_CALL_SECONDS',
    value: '30',
    description: 'Minimum duration in seconds for a customer-vendor call to qualify as a billable lead (FR-COM-04, §2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'LEAD_FEE_PAISE',
    value: '2500',
    description: 'Platform lead fee in paise per qualified call (₹25, §2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'LEAD_DEDUPLICATION_DAYS',
    value: '7',
    description: 'De-duplication window in days: one billable lead per customer-vendor pair (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'CUSTOMER_BILLABLE_LEAD_CAP_DAILY',
    value: '10',
    description: 'Daily cap on billable leads per customer to prevent excessive vendor drain (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'INITIAL_VENDOR_TOPUP_PAISE',
    value: '100000',
    description: 'Initial mandatory wallet balance top-up for newly approved vendors (₹1,000, §2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'MINIMUM_WALLET_BALANCE_PAISE',
    value: '50000',
    description: 'Minimum required vendor wallet balance in paise to appear in search results (₹500, §2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'WALLET_ALERT_THRESHOLD_HIGH_PAISE',
    value: '75000',
    description: '150% threshold for low wallet balance warning notification (₹750, §2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'WALLET_ALERT_THRESHOLD_LOW_PAISE',
    value: '50000',
    description: '100% threshold alert for critical wallet balance notification (₹500, §2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'LOW_BALANCE_GRACE_PERIOD_HOURS',
    value: '48',
    description: 'Grace period in hours before hiding a vendor with sub-minimum balance from search (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'VENDOR_RESPONSE_WINDOW_HOURS',
    value: '12',
    description: 'Standard window for vendor to accept or counter a booking request (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'VENDOR_RUSH_RESPONSE_WINDOW_HOURS',
    value: '2',
    description: 'Rush booking response window when event starts within 24 hours (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'MAX_COUNTER_OFFERS',
    value: '3',
    description: 'Maximum permitted counter-offer negotiation rounds per booking (§2.3, FR-BKG-03)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'COUNTER_OFFER_VALIDITY_HOURS',
    value: '6',
    description: 'Expiry timeframe in hours for an active counter-offer (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'DEPOSIT_PERCENT',
    value: '40',
    description: 'Initial deposit requirement percentage upon vendor acceptance (40%, §2.3, FR-BKG-04)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'DEPOSIT_PAYMENT_WINDOW_HOURS',
    value: '2',
    description: 'Payment timer in hours to complete deposit before soft hold expires (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'BALANCE_PERCENT',
    value: '60',
    description: 'Remaining balance payment percentage due before event start (60%, §2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'BALANCE_DUE_HOURS_BEFORE_EVENT',
    value: '48',
    description: 'Hours before event start time by which balance must be settled (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'FREE_CANCEL_WINDOW_HOURS',
    value: '12',
    description: 'Window in hours after confirmation where cancellation charge is 0% if >7 days to event (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'VENDOR_PAYOUT_DELAY_HOURS',
    value: '24',
    description: 'Hold timeframe after completion before automated escrow payout release (§2.3)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'REVIEW_WINDOW_DAYS',
    value: '14',
    description: 'Post-event window in days during which customer may submit a 1-5 star review (§2.3, FR-REV-01)',
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  },
];

const initialUsers = [
  {
    id: 'usr_superadmin_01',
    name: 'Super Administrator',
    email: 'admin@bookme.com',
    roles: ['superAdmin'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_verifier_01',
    name: 'KYC Verifier',
    email: 'verifier@bookme.com',
    roles: ['verifier'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_support_01',
    name: 'Customer Support Lead',
    email: 'support@bookme.com',
    roles: ['supportAgent'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_finance_01',
    name: 'Finance Controller',
    email: 'finance@bookme.com',
    roles: ['financeAdmin'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_moderator_01',
    name: 'Content & Review Moderator',
    email: 'moderator@bookme.com',
    roles: ['contentModerator'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

class InMemoryStore {
  constructor() {
    this.configs = new Map(initialConfigs.map((c) => [c.key, { ...c }]));
    this.configHistory = [];
    this.users = new Map(initialUsers.map((u) => [u.id, { ...u }]));
    this.auditLogs = [];
    this.enforcements = [];
    this.moderationQueue = [
      {
        id: 'mod_queue_01',
        itemType: 'MEDIA',
        contentUrl: 'https://cdn.bookme.com/vendors/vnd_sample/portfolio_1.jpg',
        contentText: 'Portfolio banner sample upload for review',
        reportedBy: 'system',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'mod_queue_02',
        itemType: 'REVIEW',
        contentUrl: null,
        contentText: 'Suspected off-platform transaction comment',
        reportedBy: 'usr_user_123',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  }

  // --- Configs (FR-ADM-03) ---
  getAllConfigs() {
    return Array.from(this.configs.values());
  }

  getConfig(key) {
    return this.configs.get(key) || null;
  }

  updateConfig(key, value, changeReason, updatedBy = 'system') {
    const existing = this.configs.get(key);
    const oldValue = existing ? existing.value : null;
    const updatedAt = new Date().toISOString();

    const updatedConfig = {
      key,
      value: String(value),
      description: existing ? existing.description : 'Custom parameter',
      updatedBy,
      updatedAt,
    };
    this.configs.set(key, updatedConfig);

    const historyEntry = {
      id: `cfg_hist_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      key,
      oldValue,
      newValue: String(value),
      changeReason,
      updatedBy,
      updatedAt,
    };
    this.configHistory.unshift(historyEntry);

    // Record immutable audit entry (FR-ADM-02)
    this.addAuditLog({
      actorId: updatedBy,
      action: 'CONFIG_UPDATE',
      entity: 'Config',
      entityId: key,
      beforeState: { value: oldValue },
      afterState: { value: String(value), changeReason },
    });

    return { config: updatedConfig, history: historyEntry };
  }

  getConfigHistory(key) {
    if (key) {
      return this.configHistory.filter((h) => h.key === key);
    }
    return [...this.configHistory];
  }

  // --- Users & Roles (FR-ADM-01) ---
  getAllUsers({ role, limit = 50, cursor } = {}) {
    let list = Array.from(this.users.values());
    if (role) {
      list = list.filter((u) => u.roles.includes(role));
    }
    const startIndex = cursor ? parseInt(cursor, 10) || 0 : 0;
    const items = list.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < list.length ? String(startIndex + limit) : null;
    return { items, meta: { total: list.length, nextCursor } };
  }

  getUserById(id) {
    return this.users.get(id) || null;
  }

  updateUserRoles(id, roles, updatedBy = 'system') {
    const user = this.users.get(id);
    if (!user) return null;
    const oldRoles = [...user.roles];
    user.roles = Array.from(new Set(roles));
    this.users.set(id, user);

    this.addAuditLog({
      actorId: updatedBy,
      action: 'USER_ROLES_UPDATE',
      entity: 'User',
      entityId: id,
      beforeState: { roles: oldRoles },
      afterState: { roles: user.roles },
    });

    return user;
  }

  // --- Immutable Audit Trail (FR-ADM-02) ---
  addAuditLog({ actorId, action, entity, entityId, beforeState, afterState }) {
    const entry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      actorId: actorId || 'system',
      action,
      entity,
      entityId: entityId || null,
      beforeState: beforeState || null,
      afterState: afterState || null,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  queryAuditLogs({ entity, actorId, limit = 50, cursor } = {}) {
    let list = [...this.auditLogs];
    if (entity) {
      list = list.filter((a) => a.entity && a.entity.toLowerCase() === entity.toLowerCase());
    }
    if (actorId) {
      list = list.filter((a) => a.actorId === actorId);
    }
    const startIndex = cursor ? parseInt(cursor, 10) || 0 : 0;
    const items = list.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < list.length ? String(startIndex + limit) : null;
    return { items, meta: { total: list.length, nextCursor } };
  }

  // --- Vendor Enforcement Ladder (FR-ADM-04) ---
  applyVendorEnforcement({ vendorId, action, reason, caseNotes, appliedBy = 'system' }) {
    const validActions = ['WARNING', 'SUSPENSION', 'TERMINATION'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid enforcement action: ${action}. Must be WARNING, SUSPENSION, or TERMINATION.`);
    }

    const record = {
      id: `enf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      vendorId,
      action,
      reason,
      caseNotes: caseNotes || '',
      appliedBy,
      appliedAt: new Date().toISOString(),
    };
    this.enforcements.unshift(record);

    this.addAuditLog({
      actorId: appliedBy,
      action: `VENDOR_ENFORCEMENT_${action}`,
      entity: 'Vendor',
      entityId: vendorId,
      beforeState: null,
      afterState: { action, reason, caseNotes },
    });

    return record;
  }

  getVendorEnforcements(vendorId) {
    if (vendorId) {
      return this.enforcements.filter((e) => e.vendorId === vendorId);
    }
    return [...this.enforcements];
  }

  // --- Moderation Queue (FR-VEN-02, FR-REV-04) ---
  getModerationQueue({ type, limit = 50, cursor } = {}) {
    let list = [...this.moderationQueue];
    if (type) {
      list = list.filter((m) => m.itemType === type);
    }
    const startIndex = cursor ? parseInt(cursor, 10) || 0 : 0;
    const items = list.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < list.length ? String(startIndex + limit) : null;
    return { items, meta: { total: list.length, nextCursor } };
  }

  moderateItem({ id, decision, reason, moderatorId = 'system' }) {
    const item = this.moderationQueue.find((m) => m.id === id);
    if (!item) return null;
    item.status = decision; // 'APPROVED' | 'REJECTED'
    item.moderationReason = reason;
    item.moderatedBy = moderatorId;
    item.moderatedAt = new Date().toISOString();

    this.addAuditLog({
      actorId: moderatorId,
      action: `MODERATION_${decision}`,
      entity: item.itemType === 'REVIEW' ? 'Review' : 'Media',
      entityId: id,
      beforeState: { status: 'PENDING' },
      afterState: { status: decision, reason },
    });

    return item;
  }
}

const store = new InMemoryStore();
module.exports = store;
