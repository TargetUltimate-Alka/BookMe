const crypto = require('crypto');
const db = require('../../../shared/db');

const { inMemoryStore } = db;

async function getConfigItem(key) {
  if (db.isPgActive()) {
    const res = await db.query('SELECT * FROM configs WHERE key = $1;', [key]);
    if (res.rows[0]) {
      return {
        key: res.rows[0].key,
        value: res.rows[0].value,
        description: res.rows[0].description,
        updatedBy: res.rows[0].updated_by,
        updatedAt: res.rows[0].updated_at,
      };
    }
  }
  const row = inMemoryStore.configs.get(key);
  if (!row) return null;
  return {
    key: row.key,
    value: row.value,
    description: row.description,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

async function getConfigValue(key, defaultValue = null) {
  const item = await getConfigItem(key);
  return item ? item.value : defaultValue;
}

async function getConfigNumber(key, defaultNumber = 0) {
  const raw = await getConfigValue(key, null);
  if (raw === null || raw === undefined) return defaultNumber;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultNumber;
}

async function listConfigs() {
  if (db.isPgActive()) {
    const res = await db.query('SELECT * FROM configs ORDER BY key ASC;');
    return res.rows.map((r) => ({
      key: r.key,
      value: r.value,
      description: r.description,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
    }));
  }
  return Array.from(inMemoryStore.configs.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => ({
      key: r.key,
      value: r.value,
      description: r.description,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
    }));
}

async function updateConfig(key, { value, changeReason, reason, updatedBy, actorId } = {}) {
  const existing = await getConfigItem(key);
  const oldValue = existing ? existing.value : null;
  const now = new Date().toISOString();
  const strValue = String(value);
  const resolvedReason = changeReason || reason || 'Updated by admin';
  const resolvedActor = updatedBy || actorId || 'superAdmin';
  const historyId = `cfgh_${crypto.randomBytes(6).toString('hex')}`;

  if (db.isPgActive()) {
    await db.query(
      `INSERT INTO configs (key, value, description, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_by = EXCLUDED.updated_by,
         updated_at = EXCLUDED.updated_at;`,
      [key, strValue, existing ? existing.description : 'Custom config parameter', resolvedActor, now]
    );
    await db.query(
      `INSERT INTO config_history (id, config_key, old_value, new_value, change_reason, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [historyId, key, oldValue, strValue, resolvedReason, resolvedActor, now]
    );
  }

  // Always keep inMemoryStore synced for fast reads
  inMemoryStore.configs.set(key, {
    key,
    value: strValue,
    description: existing ? existing.description : 'Custom config parameter',
    updated_by: resolvedActor,
    updated_at: now,
  });
  inMemoryStore.configHistory.unshift({
    id: historyId,
    config_key: key,
    old_value: oldValue,
    new_value: strValue,
    change_reason: resolvedReason,
    updated_by: resolvedActor,
    updated_at: now,
  });

  await appendAuditLog({
    actorId: resolvedActor,
    actorRole: 'superAdmin',
    action: 'CONFIG_UPDATE',
    entity: 'Config',
    entityId: key,
    beforeState: { key, value: oldValue },
    afterState: { key, value: strValue },
    reason: resolvedReason,
  });

  const item = await getConfigItem(key);
  const numVal = Number(item.value);
  return {
    ...item,
    value: Number.isFinite(numVal) && String(numVal) === String(item.value) ? numVal : item.value,
  };
}

async function getConfigHistory(key) {
  if (db.isPgActive()) {
    const res = await db.query(
      key
        ? 'SELECT * FROM config_history WHERE config_key = $1 ORDER BY updated_at DESC;'
        : 'SELECT * FROM config_history ORDER BY updated_at DESC;',
      key ? [key] : []
    );
    return res.rows.map((r) => ({
      id: r.id,
      key: r.config_key,
      oldValue: r.old_value,
      newValue: r.new_value,
      changeReason: r.change_reason,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
    }));
  }
  return inMemoryStore.configHistory
    .filter((h) => !key || h.config_key === key)
    .map((r) => ({
      id: r.id,
      key: r.config_key,
      oldValue: r.old_value,
      newValue: r.new_value,
      changeReason: r.change_reason,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
    }));
}

/**
 * Writes an immutable audit entry (FR-ADM-02). No update or delete methods exist.
 */
async function appendAuditLog({
  actorId,
  actorRole = null,
  action,
  entity,
  targetType,
  entityId = null,
  targetId = null,
  beforeState = null,
  afterState = null,
  metadata = null,
  reason = null,
}) {
  const id = `aud_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  const resolvedEntity = entity || targetType || 'Vendor';
  const resolvedEntityId = entityId || targetId || null;
  const resolvedAfter = afterState || metadata || null;

  if (db.isPgActive()) {
    await db.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, entity, entity_id, before_state, after_state, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
      [
        id,
        actorId || 'system',
        actorRole,
        action,
        resolvedEntity,
        resolvedEntityId,
        beforeState ? JSON.stringify(beforeState) : null,
        resolvedAfter ? JSON.stringify(resolvedAfter) : null,
        reason,
        now,
      ]
    );
  }

  const entry = {
    id,
    actorId: actorId || 'system',
    actorRole,
    action,
    entity: resolvedEntity,
    entityId: resolvedEntityId,
    beforeState,
    afterState: resolvedAfter,
    reason,
    timestamp: now,
  };
  inMemoryStore.auditLogs.unshift(entry);
  return entry;
}

async function queryAuditLogs({ entity, targetId, action, actorId, limit = 50 } = {}) {
  const maxLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  if (db.isPgActive()) {
    const conds = [];
    const vals = [];
    let idx = 1;
    if (entity) {
      conds.push(`LOWER(entity) = LOWER($${idx++})`);
      vals.push(entity);
    }
    if (targetId) {
      conds.push(`entity_id = $${idx++}`);
      vals.push(targetId);
    }
    if (action) {
      conds.push(`action = $${idx++}`);
      vals.push(action);
    }
    if (actorId) {
      conds.push(`actor_id = $${idx++}`);
      vals.push(actorId);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const res = await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx};`,
      [...vals, maxLimit]
    );
    const items = res.rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorRole: r.actor_role,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      beforeState: r.before_state,
      afterState: r.after_state,
      reason: r.reason,
      timestamp: r.created_at,
    }));
    return {
      items,
      meta: { limit: maxLimit, hasMore: false, total: items.length },
    };
  }

  let items = [...inMemoryStore.auditLogs];
  if (entity) {
    items = items.filter((a) => String(a.entity).toLowerCase() === String(entity).toLowerCase());
  }
  if (targetId) {
    items = items.filter((a) => a.entityId === targetId);
  }
  if (action) {
    items = items.filter((a) => a.action === action);
  }
  if (actorId) {
    items = items.filter((a) => a.actorId === actorId);
  }
  const sliced = items.slice(0, maxLimit);
  return {
    items: sliced,
    meta: { limit: maxLimit, hasMore: items.length > maxLimit, total: items.length },
  };
}

/**
 * Writes an event to the transactional outbox (SRS §11.3).
 */
async function appendOutboxEvent({ topic, idempotencyKey, payload }) {
  const id = `evt_${crypto.randomBytes(6).toString('hex')}`;
  const dedupKey = idempotencyKey || `${topic}:${id}`;
  const now = new Date().toISOString();

  if (db.isPgActive()) {
    await db.query(
      `INSERT INTO outbox_events (id, topic, idempotency_key, payload, published, created_at)
       VALUES ($1, $2, $3, $4, FALSE, $5)
       ON CONFLICT (idempotency_key) DO NOTHING;`,
      [id, topic, dedupKey, JSON.stringify(payload), now]
    );
  }

  const existing = inMemoryStore.outboxEvents.find((e) => e.idempotencyKey === dedupKey);
  if (!existing) {
    inMemoryStore.outboxEvents.unshift({
      id,
      topic,
      idempotencyKey: dedupKey,
      payload,
      published: false,
      createdAt: now,
    });
  }
  return { id, topic, idempotencyKey: dedupKey, payload, createdAt: now };
}

async function enqueueOutboxEvent(topic, payload) {
  return appendOutboxEvent({ topic, payload });
}

async function getAuditLogs(opts = {}) {
  const res = await queryAuditLogs(opts);
  return res.items;
}

module.exports = {
  getConfigItem,
  getConfigValue,
  getConfigNumber,
  listConfigs,
  getAllConfigs: listConfigs,
  updateConfig,
  getConfigHistory,
  appendAuditLog,
  recordAuditLog: appendAuditLog,
  queryAuditLogs,
  getAuditLogs,
  appendOutboxEvent,
  enqueueOutboxEvent,
};
