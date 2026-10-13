const { ALL_CATEGORIES } = require('./constants/categoriesData');
const { DEFAULT_CONFIGS } = require('./constants/defaultConfigs');

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
  const now = new Date();
  return [
    {
      id: 'vnd_sunset_caterers',
      user_id: 'usr_sunset_01',
      business_name: 'Sunset Royal Caterers & Event Crafters',
      category: 'catering',
      description:
        'Specialized in royal destination wedding buffets, multi-cuisine live counters, and artisanal mocktail lounges.',
      photo_url: null,
      location: 'SG Highway, Ahmedabad, India',
      address: 'SG Highway, Ahmedabad, Gujarat',
      latitude: 23.033863,
      longitude: 72.507423,
      service_radius_km: 50,
      service_areas: ['Ahmedabad', 'Gandhinagar'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.96,
      review_count: 42,
      is_featured: true,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'vnd_dream_clicks',
      user_id: 'usr_dream_02',
      business_name: 'Dream Clicks Cinematic Studio',
      category: 'photography',
      description:
        'Award-winning candid wedding storytellers, cinematic 4K highlight reels, drone aerial shoots.',
      photo_url: null,
      location: 'Vastrapur, Ahmedabad, India',
      address: 'Vastrapur, Ahmedabad, Gujarat',
      latitude: 23.035001,
      longitude: 72.529324,
      service_radius_km: 100,
      service_areas: ['Ahmedabad', 'Udaipur', 'Mumbai'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.9,
      review_count: 38,
      is_featured: true,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'vnd_aura_decors',
      user_id: 'usr_aura_03',
      business_name: 'Aura Luxury Stage & Floral Decors',
      category: 'decoration',
      description:
        'Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap setups.',
      photo_url: null,
      location: 'Bodakdev, Ahmedabad, India',
      address: 'Bodakdev, Ahmedabad, Gujarat',
      latitude: 23.040212,
      longitude: 72.511891,
      service_radius_km: 60,
      service_areas: ['Ahmedabad'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.85,
      review_count: 29,
      is_featured: false,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'vnd_electra_dj',
      user_id: 'usr_electra_04',
      business_name: 'Electra DJ & Sound Innovations',
      category: 'dj',
      description:
        'High-energy club DJ setups, celebrity sangeet nights, JBL line array sound & intelligent CO2 fog jets.',
      photo_url: null,
      location: 'Prahlad Nagar, Ahmedabad, India',
      address: 'Prahlad Nagar, Ahmedabad, Gujarat',
      latitude: 23.012034,
      longitude: 72.510754,
      service_radius_km: 80,
      service_areas: ['Ahmedabad'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.95,
      review_count: 54,
      is_featured: false,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    },
  ];
}

function buildInitialVendorCategoriesArray() {
  return [
    { vendor_id: 'vnd_sunset_caterers', category_id: 'cat_09_caterer', is_primary: true },
    { vendor_id: 'vnd_dream_clicks', category_id: 'cat_01_wedding_photographer', is_primary: true },
    { vendor_id: 'vnd_dream_clicks', category_id: 'cat_02_candid_photographer', is_primary: false },
    { vendor_id: 'vnd_aura_decors', category_id: 'cat_17_wedding_decorator', is_primary: true },
    { vendor_id: 'vnd_electra_dj', category_id: 'cat_25_dj', is_primary: true },
  ];
}

function buildInitialServicesArray() {
  const now = new Date();
  return [
    {
      id: 'svc_royal_buffet',
      vendor_id: 'vnd_sunset_caterers',
      category_id: 'cat_09_caterer',
      title: 'Signature Royal Wedding Multi-Cuisine Feast',
      description:
        '4 Starters, 6 Main Course, Dal Makhani, Paneer Tikka Masala, Dum Biryani & 3 Desserts',
      base_price: 45000,
      base_price_paise: 4500000n,
      is_active: true,
      created_at: now,
    },
    {
      id: 'svc_live_chaat',
      vendor_id: 'vnd_sunset_caterers',
      category_id: 'cat_12_live_food_counter',
      title: 'Live Delhi Chaat & Street Food Counter',
      description: 'Pani Puri, Dahi Bhalla, Sev Puri & Aloo Tikki with 2 Dedicated Chefs',
      base_price: 15000,
      base_price_paise: 1500000n,
      is_active: true,
      created_at: now,
    },
    {
      id: 'svc_candid_photo',
      vendor_id: 'vnd_dream_clicks',
      category_id: 'cat_02_candid_photographer',
      title: 'Full Day Candid Wedding Shoot & 4K Cinema',
      description: '2 Photographers + 1 Cinematographer + Drone Aerial Coverage',
      base_price: 55000,
      base_price_paise: 5500000n,
      is_active: true,
      created_at: now,
    },
  ];
}

function buildInitialPackagesArray() {
  const now = new Date().toISOString();
  return [
    {
      id: 'pkg_royal_buffet',
      vendor_id: 'vnd_sunset_caterers',
      category_id: 'cat_09_caterer',
      name: 'Signature 5-Course Royal Wedding Buffet',
      tier: 'Premium',
      description: 'Complete royal wedding catering buffet package.',
      service_ids: ['svc_royal_buffet'],
      price: 45000,
      base_price_paise: 4500000,
      price_unit: 'PER_DAY',
      pricing_unit: 'per_day',
      inclusions: ['4 Welcome Drinks', '4 Starters', '6 Main Courses', '3 Live Counters'],
      exclusions: [],
      brand_attributes: {},
      min_guests: 100,
      max_guests: 1500,
      duration_hours: 8,
      overtime_rate_paise: 250000,
      total_capacity_units: 2,
      capacity_units: 2,
      security_deposit_paise: 500000,
      gst_rate_bps: 500,
      gst_rate_percent: 5,
      hsn_sac_code: '996331',
      tax_inclusive: false,
      is_tax_inclusive: false,
      cancellation_policy: 'MODERATE',
      status: 'PUBLISHED',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pkg_platinum_photo',
      vendor_id: 'vnd_dream_clicks',
      category_id: 'cat_01_wedding_photographer',
      name: 'Platinum Wedding Cinema & Drone Package',
      tier: 'Premium',
      description: 'Full-day candid photography, cinematography, and aerial drone coverage.',
      service_ids: ['svc_candid_photo'],
      price: 95000,
      base_price_paise: 9500000,
      price_unit: 'PER_DAY',
      pricing_unit: 'per_day',
      inclusions: ['2 Candid Photographers', '2 Cinematographers', '1 Drone Pilot'],
      exclusions: [],
      brand_attributes: {},
      min_guests: 50,
      max_guests: 1000,
      duration_hours: 10,
      overtime_rate_paise: 500000,
      total_capacity_units: 2,
      capacity_units: 2,
      security_deposit_paise: 1000000,
      gst_rate_bps: 1800,
      gst_rate_percent: 18,
      hsn_sac_code: '998386',
      tax_inclusive: false,
      is_tax_inclusive: false,
      cancellation_policy: 'MODERATE',
      status: 'PUBLISHED',
      created_at: now,
      updated_at: now,
    },
  ];
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
