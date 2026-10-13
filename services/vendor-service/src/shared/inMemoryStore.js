const { ALL_CATEGORIES } = require('./constants/categoriesData');
const { DEFAULT_CONFIGS } = require('./constants/defaultConfigs');
const { buildCanonicalVendorsData } = require('./constants/initialVendorsData');

function buildInitialCategoriesArray() {
  return ALL_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parent_id: c.parentId || null,
    is_regulated: Boolean(c.isRegulated),
    compliance_note: c.complianceNote || null,
    default_hsn_sac: c.defaultHsnSac || '998596',
    default_gst_rate_percent: c.defaultGstRatePercent ?? 18,
    created_at: new Date().toISOString(),
  }));
}

function buildInitialConfigsMap() {
  const map = new Map();
  for (const cfg of DEFAULT_CONFIGS) {
    map.set(cfg.key, {
      key: cfg.key,
      value: String(cfg.value),
      description: cfg.description,
      updated_by: 'system_seed',
      updated_at: new Date().toISOString(),
    });
  }
  return map;
}

function buildInitialVendorsArray() {
  return buildCanonicalVendorsData().vendors;
}

function buildInitialVendorCategoriesArray() {
  return buildCanonicalVendorsData().vendorCategories;
}

function buildInitialServicesArray() {
  return buildCanonicalVendorsData().services;
}

function buildInitialPackagesArray() {
  return buildCanonicalVendorsData().packages;
}

function buildInitialAvailabilityArray() {
  return [
    {
      id: 'blk_dec_05',
      vendor_id: 'vnd_sunset_caterers',
      date: '2026-12-05',
      status: 'BLOCKED',
      reason: '💍 Booked for Grand Destination Wedding',
      created_at: new Date(),
    },
  ];
}

const capacityLockQueues = new Map();

/**
 * Per-key asynchronous mutex lock to guarantee zero-oversell atomic concurrency
 * for holdCapacity / bookCapacity / releaseCapacity when running in in-memory mode.
 */
async function withCapacityLock(lockKey, fn) {
  const prev = capacityLockQueues.get(lockKey) || Promise.resolve();
  let releaseNext;
  const next = new Promise((resolve) => {
    releaseNext = resolve;
  });
  capacityLockQueues.set(
    lockKey,
    prev.then(() => next, () => next)
  );
  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    releaseNext();
    if (capacityLockQueues.get(lockKey) === next) {
      capacityLockQueues.delete(lockKey);
    }
  }
}

const inMemoryStore = {
  categories: buildInitialCategoriesArray(),
  configs: buildInitialConfigsMap(),
  configHistory: [],
  auditLogs: [],
  outboxEvents: [],
  vendors: buildInitialVendorsArray(),
  vendorCategories: buildInitialVendorCategoriesArray(),
  vendorKycRecords: [],
  vendorAgreements: [],
  vendorStatusHistory: [],
  vendorViolations: [],
  services: buildInitialServicesArray(),
  packages: buildInitialPackagesArray(),
  packageAddons: [],
  packageDiscounts: [],
  discounts: [],
  vendorMedia: [],
  mediaAssets: [],
  availability: buildInitialAvailabilityArray(),
  packageAvailability: [],
  capacityReservations: [],
  notifyRequests: [],
  vendorWallets: [],
  walletTransactions: [],
  withCapacityLock,

  async executeSql(text = '', _params = []) {
    const sql = String(text).trim().toUpperCase();
    if (sql.startsWith('SELECT 1')) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }
    if (sql.includes('COUNT(*)') && sql.includes('VENDORS')) {
      const demoCount = this.vendors.filter((v) => v.is_demo).length;
      return { rows: [{ count: String(demoCount) }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  },

  reset() {
    this.categories = buildInitialCategoriesArray();
    this.configs = buildInitialConfigsMap();
    this.configHistory.length = 0;
    this.auditLogs.length = 0;
    this.outboxEvents.length = 0;
    this.vendors = buildInitialVendorsArray();
    this.vendorCategories = buildInitialVendorCategoriesArray();
    this.vendorKycRecords.length = 0;
    this.vendorAgreements.length = 0;
    this.vendorStatusHistory.length = 0;
    this.vendorViolations.length = 0;
    this.services = buildInitialServicesArray();
    this.packages = buildInitialPackagesArray();
    this.packageAddons.length = 0;
    this.packageDiscounts.length = 0;
    this.discounts.length = 0;
    this.vendorMedia.length = 0;
    this.mediaAssets.length = 0;
    this.availability = buildInitialAvailabilityArray();
    this.packageAvailability.length = 0;
    this.capacityReservations.length = 0;
    this.notifyRequests.length = 0;
    this.vendorWallets.length = 0;
    this.walletTransactions.length = 0;
    capacityLockQueues.clear();
  },
};

module.exports = inMemoryStore;
