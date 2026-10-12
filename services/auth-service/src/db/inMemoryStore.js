const fs = require('fs');
const path = require('path');

/**
 * Resilient File-Backed & In-Memory Store for auth-service
 */
class InMemoryStore {
  constructor() {
    this.users = new Map(); // id -> user
    this.refreshTokens = new Map(); // token_hash -> tokenRecord
    this.otpVerifications = []; // list of OTP verification attempts
    this.verificationTokens = new Map(); // token -> record
    this.agreementAcceptances = []; // list of append-only records
    this.phoneLockouts = new Map(); // phoneHash -> lockoutRecord
    this.dataDir = path.join(__dirname, '../../data');
    this.dataFile = path.join(this.dataDir, 'auth_db.json');
    this.isTest = process.env.NODE_ENV === 'test';

    this.loadFromDisk();
  }

  loadFromDisk() {
    if (this.isTest) return;

    try {
      if (fs.existsSync(this.dataFile)) {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.users)) {
          for (const u of parsed.users) {
            this.users.set(u.id, u);
          }
        }
        if (Array.isArray(parsed.refreshTokens)) {
          for (const t of parsed.refreshTokens) {
            this.refreshTokens.set(t.token_hash || t.token, t);
          }
        }
        if (Array.isArray(parsed.agreementAcceptances)) {
          this.agreementAcceptances = parsed.agreementAcceptances;
        }
      }
    } catch (err) {
      console.warn('[auth-service] Notice loading persisted database file:', err.message);
    }
  }

  async saveToDisk() {
    if (this.isTest) return;

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const payload = {
        users: Array.from(this.users.values()),
        refreshTokens: Array.from(this.refreshTokens.values()),
        agreementAcceptances: this.agreementAcceptances,
        lastUpdated: new Date().toISOString(),
      };

      await fs.promises.writeFile(this.dataFile, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[auth-service] Failed to persist data to disk:', err.message);
    }
  }

  reset() {
    this.users.clear();
    this.refreshTokens.clear();
    this.otpVerifications = [];
    this.verificationTokens.clear();
    this.agreementAcceptances = [];
    this.phoneLockouts.clear();
    if (this.isTest) return;
    this.saveToDisk().catch(() => {});
  }

  // --- User operations ---
  async insertUser(user) {
    for (const existing of this.users.values()) {
      if (user.phone_hash && existing.phone_hash === user.phone_hash) {
        const err = new Error('duplicate key value violates unique constraint "users_phone_hash_key"');
        err.code = '23505';
        throw err;
      }
      if (user.email && existing.email && existing.email.toLowerCase() === user.email.toLowerCase()) {
        const err = new Error('duplicate key value violates unique constraint "users_email_key"');
        err.code = '23505';
        throw err;
      }
    }

    const record = {
      ...user,
      email: user.email ? user.email.toLowerCase() : null,
      status: user.status || 'ACTIVE',
      failed_attempts: user.failed_attempts || 0,
      locked_until: user.locked_until || null,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
    };

    this.users.set(user.id, record);
    await this.saveToDisk();
    return record;
  }

  async findUserByPhoneHash(phoneHash) {
    if (!phoneHash) return null;
    for (const u of this.users.values()) {
      if (u.phone_hash === phoneHash) {
        return u;
      }
    }
    return null;
  }

  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email && u.email.toLowerCase() === normalized) {
        return { ...u };
      }
    }
    return null;
  }

  async findUserById(id) {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async updateUserProfile(id, { name, email }) {
    const u = this.users.get(id);
    if (!u) return null;
    if (name) u.name = name;
    if (email !== undefined) u.email = email ? email.toLowerCase() : null;
    u.updated_at = new Date().toISOString();
    this.users.set(id, u);
    await this.saveToDisk();
    return { ...u };
  }

  async incrementUserFailedAttempts(userId, lockoutMinutes = 15, maxAttempts = 5) {
    const u = this.users.get(userId);
    if (!u) return null;
    u.failed_attempts = (u.failed_attempts || 0) + 1;
    if (u.failed_attempts >= maxAttempts) {
      u.locked_until = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
      u.status = 'LOCKED';
    }
    u.updated_at = new Date().toISOString();
    this.users.set(userId, u);
    await this.saveToDisk();
    return { failed_attempts: u.failed_attempts, locked_until: u.locked_until, status: u.status };
  }

  async resetUserFailedAttempts(userId) {
    const u = this.users.get(userId);
    if (!u) return false;
    u.failed_attempts = 0;
    u.locked_until = null;
    u.status = 'ACTIVE';
    u.updated_at = new Date().toISOString();
    this.users.set(userId, u);
    await this.saveToDisk();
    return true;
  }

  // --- OTP operations ---
  async insertOtp(record) {
    const entry = {
      ...record,
      consumed: false,
      failed_attempts: 0,
      created_at: new Date().toISOString(),
    };
    this.otpVerifications.push(entry);
    return entry;
  }

  async getLatestOtp(phoneHash) {
    for (let i = this.otpVerifications.length - 1; i >= 0; i--) {
      if (this.otpVerifications[i].phone_hash === phoneHash) {
        return this.otpVerifications[i];
      }
    }
    return null;
  }

  async incrementOtpFailedAttempts(otpId) {
    for (const otp of this.otpVerifications) {
      if (otp.id === otpId) {
        otp.failed_attempts = (otp.failed_attempts || 0) + 1;
        return otp.failed_attempts;
      }
    }
    return 1;
  }

  async markOtpConsumed(otpId) {
    for (const otp of this.otpVerifications) {
      if (otp.id === otpId) {
        otp.consumed = true;
        return true;
      }
    }
    return false;
  }

  // --- Verification Token operations ---
  async insertVerificationToken(record) {
    this.verificationTokens.set(record.token, {
      ...record,
      consumed: false,
      created_at: new Date().toISOString(),
    });
    return record;
  }

  async findVerificationToken(token) {
    const record = this.verificationTokens.get(token);
    return record ? { ...record } : null;
  }

  async consumeVerificationToken(token) {
    const record = this.verificationTokens.get(token);
    if (record) {
      record.consumed = true;
      return true;
    }
    return false;
  }

  // --- Phone Lockouts (FR-ONB-01) ---
  async getPhoneLockout(phoneHash) {
    const entry = this.phoneLockouts.get(phoneHash);
    return entry ? { ...entry } : null;
  }

  async recordFailedOtpAttempt(phoneHash, lockoutMinutes = 15, maxAttempts = 5) {
    let entry = this.phoneLockouts.get(phoneHash);
    if (!entry) {
      entry = { phone_hash: phoneHash, failed_attempts: 0, locked_until: null };
    }
    entry.failed_attempts += 1;
    if (entry.failed_attempts >= maxAttempts) {
      entry.locked_until = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
    }
    this.phoneLockouts.set(phoneHash, entry);
    return entry;
  }

  async resetPhoneLockout(phoneHash) {
    const entry = this.phoneLockouts.get(phoneHash);
    if (entry) {
      entry.failed_attempts = 0;
      entry.locked_until = null;
      this.phoneLockouts.set(phoneHash, entry);
    }
    return true;
  }

  // --- Refresh Token operations ---
  async insertRefreshToken(record) {
    const entry = {
      ...record,
      revoked: false,
      created_at: new Date().toISOString(),
    };
    this.refreshTokens.set(record.token_hash, entry);
    await this.saveToDisk();
    return entry;
  }

  async findRefreshTokenByHash(tokenHash) {
    const record = this.refreshTokens.get(tokenHash);
    return record ? { ...record } : null;
  }

  async revokeRefreshTokenByHash(tokenHash) {
    const record = this.refreshTokens.get(tokenHash);
    if (record) {
      record.revoked = true;
      await this.saveToDisk();
      return true;
    }
    return false;
  }

  async revokeTokenFamily(familyId) {
    for (const record of this.refreshTokens.values()) {
      if (record.family_id === familyId) {
        record.revoked = true;
      }
    }
    await this.saveToDisk();
    return true;
  }

  async revokeAllUserTokens(userId) {
    for (const record of this.refreshTokens.values()) {
      if (record.user_id === userId) {
        record.revoked = true;
      }
    }
    await this.saveToDisk();
    return true;
  }

  // --- Agreement operations ---
  async insertAgreementAcceptance(record) {
    const entry = {
      ...record,
      accepted_at: new Date().toISOString(),
    };
    this.agreementAcceptances.push(entry);
    await this.saveToDisk();
    return entry;
  }

  async getAgreementAcceptances(userId) {
    return this.agreementAcceptances
      .filter((a) => a.user_id === userId)
      .sort((a, b) => new Date(b.accepted_at) - new Date(a.accepted_at));
  }

  async getLatestAgreementAcceptance(userId, agreementType) {
    const filtered = this.agreementAcceptances
      .filter((a) => a.user_id === userId && a.agreement_type === agreementType)
      .sort((a, b) => new Date(b.accepted_at) - new Date(a.accepted_at));
    return filtered[0] || null;
  }
}

const inMemoryStore = new InMemoryStore();
module.exports = inMemoryStore;
