const fs = require('fs');
const path = require('path');

/**
 * Resilient File-Backed Persistent Store for auth-service
 * Stores users and refresh tokens persistently on disk (data/auth_db.json)
 * so that all accounts are permanently saved even when PostgreSQL is not running.
 */

class InMemoryStore {
  constructor() {
    this.users = new Map(); // id -> user
    this.refreshTokens = new Map(); // token -> tokenRecord
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
            this.refreshTokens.set(t.token, t);
          }
        }
        console.log(`[auth-service] Loaded ${this.users.size} persisted user(s) from ${this.dataFile}`);
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
    if (this.isTest) return;
    this.saveToDisk().catch(() => {});
  }

  // User operations
  async insertUser(user) {
    // Check email uniqueness
    for (const existing of this.users.values()) {
      if (existing.email.toLowerCase() === user.email.toLowerCase()) {
        const err = new Error('duplicate key value violates unique constraint "users_email_key"');
        err.code = '23505';
        throw err;
      }
    }

    const record = {
      ...user,
      email: user.email.toLowerCase(),
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
    };

    this.users.set(user.id, record);
    await this.saveToDisk();
    return record;
  }

  async findUserByEmail(email) {
    const normalized = (email || '').trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return { ...u };
      }
    }
    return null;
  }

  async findUserById(id) {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async updateUserName(id, newName) {
    const u = this.users.get(id);
    if (!u) return null;
    u.name = newName;
    u.updated_at = new Date().toISOString();
    this.users.set(id, u);
    await this.saveToDisk();
    return { ...u };
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  // Refresh Token operations
  async insertRefreshToken(tokenRecord) {
    const record = {
      ...tokenRecord,
      revoked: false,
      created_at: new Date().toISOString(),
    };
    this.refreshTokens.set(tokenRecord.token, record);
    await this.saveToDisk();
    return record;
  }

  async findRefreshToken(token) {
    const record = this.refreshTokens.get(token);
    return record ? { ...record } : null;
  }

  async revokeRefreshToken(token) {
    const record = this.refreshTokens.get(token);
    if (record) {
      record.revoked = true;
      this.refreshTokens.set(token, record);
      await this.saveToDisk();
      return true;
    }
    return false;
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
}

const inMemoryStore = new InMemoryStore();
module.exports = inMemoryStore;
