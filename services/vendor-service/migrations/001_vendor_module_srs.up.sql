-- =============================================================================
-- Migration 001 (UP): Complete BookMe Vendor Module Schema (SRS v1.0)
-- Versioned, idempotent, non-destructive upgrade of vendor-service schema.
-- =============================================================================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm extension not available in this PostgreSQL instance; falling back to standard btree/ILIKE.';
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS extension not available in this PostgreSQL instance; falling back to indexed Haversine SQL.';
END $$;

-- 1. Categories Hierarchy (60+ Service Types & 8 Parent Domains - SRS Section 4)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  parent_id VARCHAR(80) REFERENCES categories(id) ON DELETE SET NULL,
  is_regulated BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_note TEXT,
  default_hsn_sac VARCHAR(20) DEFAULT '998596',
  default_gst_rate_percent NUMERIC(5, 2) DEFAULT 18.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 2. Vendors Table & SRS Onboarding / KYC Columns (FR-ONB-02..06, FR-VEN-01)
CREATE TABLE IF NOT EXISTS vendors (
  id VARCHAR(80) PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'catering',
  description TEXT,
  location VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  is_demo BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_location JSONB DEFAULT '{}'::jsonb;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state VARCHAR(120);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 25;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
  CHECK (kyc_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'));
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS digilocker_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS digilocker_ref TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS aadhaar_masked VARCHAR(10);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_name VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kyc_consent_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pan_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pan_ref TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pan_masked VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_ref TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_masked VARCHAR(40);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS agreement_version VARCHAR(30);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS agreement_signer_ip VARCHAR(64);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS agreement_ip VARCHAR(64);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS enforcement_status VARCHAR(30) NOT NULL DEFAULT 'NONE';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS response_score INTEGER NOT NULL DEFAULT 100;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS featured_rank INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS wallet_balance_paise BIGINT NOT NULL DEFAULT 100000;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS wallet_grace_expires_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_vendors_kyc_demo_wallet ON vendors(kyc_status, is_demo, wallet_balance_paise);
CREATE INDEX IF NOT EXISTS idx_vendors_lat_lng ON vendors(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(LOWER(city));
CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(rating DESC NULLS LAST);

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_vendors_business_name_trgm ON vendors USING gin (business_name gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  CREATE INDEX IF NOT EXISTS idx_vendors_business_name_lower ON vendors(LOWER(business_name));
END $$;

-- 3. Vendor Multi-Category Mapping (FR-ONB-02, FR-VEN-01)
CREATE TABLE IF NOT EXISTS vendor_categories (
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id VARCHAR(80) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vendor_id, category_id)
);

ALTER TABLE vendor_categories ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vendor_categories_cat ON vendor_categories(category_id);

-- 4. Vendor Verification Status History (FR-ONB-06)
CREATE TABLE IF NOT EXISTS vendor_status_history (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  changed_by VARCHAR(80) NOT NULL,
  changed_by_role VARCHAR(40) DEFAULT 'system',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendor_status_history ADD COLUMN IF NOT EXISTS from_status VARCHAR(30);
ALTER TABLE vendor_status_history ADD COLUMN IF NOT EXISTS to_status VARCHAR(30);
ALTER TABLE vendor_status_history ADD COLUMN IF NOT EXISTS old_status VARCHAR(30);
ALTER TABLE vendor_status_history ADD COLUMN IF NOT EXISTS new_status VARCHAR(30);
ALTER TABLE vendor_status_history ADD COLUMN IF NOT EXISTS changed_by_role VARCHAR(40) DEFAULT 'system';
ALTER TABLE vendor_status_history ALTER COLUMN new_status DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_status_history_vendor ON vendor_status_history(vendor_id, created_at DESC);

-- 4b. Vendor KYC Records (FR-ONB-03, NFR-SEC-05)
CREATE TABLE IF NOT EXISTS vendor_kyc_records (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) UNIQUE NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  digilocker_ref_enc TEXT,
  aadhaar_last4 VARCHAR(10),
  verified_name VARCHAR(255),
  digilocker_verified BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  pan_masked VARCHAR(20),
  pan_ref_enc TEXT,
  pan_verified BOOLEAN NOT NULL DEFAULT FALSE,
  bank_account_masked VARCHAR(40),
  bank_ifsc VARCHAR(20),
  bank_ref_enc TEXT,
  bank_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_notes TEXT,
  verified_by VARCHAR(80),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendor_kyc_records ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE vendor_kyc_records ADD COLUMN IF NOT EXISTS verified_by VARCHAR(80);
ALTER TABLE vendor_kyc_records ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_vendor ON vendor_kyc_records(vendor_id);

-- 4c. Vendor Agreements (FR-ONB-04)
CREATE TABLE IF NOT EXISTS vendor_agreements (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  agreement_version VARCHAR(30) NOT NULL,
  document_hash VARCHAR(128),
  ip_address VARCHAR(64),
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_agreements_vendor ON vendor_agreements(vendor_id);

-- 4d. Vendor Off-Platform Violations & Enforcement (FR-ADM-04)
CREATE TABLE IF NOT EXISTS vendor_violations (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  violation_type VARCHAR(60) NOT NULL,
  action_taken VARCHAR(40) NOT NULL,
  reason TEXT NOT NULL,
  booking_id VARCHAR(80),
  recorded_by VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_violations_vendor ON vendor_violations(vendor_id);

-- 4e. Vendor Wallets & Transactions (FR-WAL-01..04)
CREATE TABLE IF NOT EXISTS vendor_wallets (
  vendor_id VARCHAR(80) PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  balance_paise BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  txn_type VARCHAR(40) NOT NULL,
  amount_paise BIGINT NOT NULL,
  balance_after_paise BIGINT NOT NULL,
  reference_id VARCHAR(80),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_vendor ON wallet_transactions(vendor_id, created_at DESC);

-- 5. Legacy Services Table (preserved for V1 backward compatibility)
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) REFERENCES vendors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  base_price NUMERIC(12, 2) NOT NULL,
  base_price_paise BIGINT DEFAULT 0,
  category_id VARCHAR(80) REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS base_price_paise BIGINT DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id VARCHAR(80);

-- 6. Packages Table with Tiers, Integer Paise, GST, HSN/SAC & Security Deposit (FR-VEN-03, FR-VEN-09, FR-VEN-11)
CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_ids VARCHAR(80)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(80)[],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE packages ADD COLUMN IF NOT EXISTS category_id VARCHAR(80);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS tier VARCHAR(30) NOT NULL DEFAULT 'Standard'
  CHECK (tier IN ('Basic', 'Standard', 'Premium'));
ALTER TABLE packages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS base_price_paise BIGINT NOT NULL DEFAULT 0
  CHECK (base_price_paise >= 0);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS pricing_unit VARCHAR(30) NOT NULL DEFAULT 'per_day'
  CHECK (pricing_unit IN ('per_day', 'per_hour', 'per_plate', 'flat'));
ALTER TABLE packages ADD COLUMN IF NOT EXISTS inclusions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS exclusions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS brand_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS guest_min INTEGER DEFAULT 1;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS guest_max INTEGER DEFAULT 500;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 8;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS overtime_rate_paise BIGINT NOT NULL DEFAULT 0
  CHECK (overtime_rate_paise >= 0);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS capacity_units INTEGER NOT NULL DEFAULT 1
  CHECK (capacity_units >= 0);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS security_deposit_paise BIGINT NOT NULL DEFAULT 0
  CHECK (security_deposit_paise >= 0);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS gst_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(20) NOT NULL DEFAULT '998596';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS price_unit VARCHAR(30) DEFAULT 'per_day';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS min_guests INTEGER DEFAULT 1;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 500;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS gst_rate_bps INTEGER DEFAULT 1800;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS total_capacity_units INTEGER NOT NULL DEFAULT 1;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS cancellation_policy VARCHAR(40) DEFAULT 'MODERATE';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
  CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));
ALTER TABLE packages ADD COLUMN IF NOT EXISTS compliance_acknowledged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_packages_vendor_status ON packages(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_packages_category_price ON packages(category_id, base_price_paise);

-- 7. Package Add-Ons Table (FR-VEN-04)
CREATE TABLE IF NOT EXISTS package_addons (
  id VARCHAR(80) PRIMARY KEY,
  package_id VARCHAR(80) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  pricing_basis VARCHAR(40) NOT NULL DEFAULT 'flat'
    CHECK (pricing_basis IN ('flat', 'per_hour', 'per_day', 'per_plate', 'per_km', 'per_unit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE package_addons ADD COLUMN IF NOT EXISTS price_unit VARCHAR(40) DEFAULT 'per_unit';
ALTER TABLE package_addons ADD COLUMN IF NOT EXISTS max_qty INTEGER DEFAULT 10;
ALTER TABLE package_addons ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_package_addons_pkg ON package_addons(package_id);

-- 8. Discounts Table (FR-VEN-05)
CREATE TABLE IF NOT EXISTS discounts (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('VENDOR', 'PACKAGE')),
  package_id VARCHAR(80) REFERENCES packages(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('PERCENT', 'FLAT')),
  value NUMERIC(12, 2) NOT NULL CHECK (value >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  min_order_paise BIGINT NOT NULL DEFAULT 0 CHECK (min_order_paise >= 0),
  code VARCHAR(60),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discounts_vendor_dates ON discounts(vendor_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS package_discounts (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package_id VARCHAR(80) REFERENCES packages(id) ON DELETE CASCADE,
  name VARCHAR(255),
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(12, 2) NOT NULL,
  min_order_paise BIGINT NOT NULL DEFAULT 0,
  promo_code VARCHAR(60),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE package_discounts ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE package_discounts ALTER COLUMN end_date DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pkg_discounts_vendor ON package_discounts(vendor_id);

-- 9. Media Assets & Moderation Queue Table (FR-VEN-02)
CREATE TABLE IF NOT EXISTS media_assets (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package_id VARCHAR(80) REFERENCES packages(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(60) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4')),
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 20971520),
  duration_seconds NUMERIC(5, 2),
  sha256_checksum VARCHAR(64) NOT NULL,
  storage_url TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  moderated_by VARCHAR(80),
  moderation_reason TEXT,
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_assets_vendor_pkg ON media_assets(vendor_id, package_id, status);
CREATE INDEX IF NOT EXISTS idx_media_assets_sha256 ON media_assets(sha256_checksum);

CREATE TABLE IF NOT EXISTS vendor_media (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package_id VARCHAR(80) REFERENCES packages(id) ON DELETE SET NULL,
  media_type VARCHAR(20) NOT NULL,
  mime_type VARCHAR(60) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  duration_seconds NUMERIC(5, 2),
  content_hash_sha256 VARCHAR(64) NOT NULL,
  storage_key TEXT,
  storage_url TEXT NOT NULL,
  moderation_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  moderation_notes TEXT,
  moderated_by VARCHAR(80),
  moderated_at TIMESTAMPTZ,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_media_vendor ON vendor_media(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_media_hash ON vendor_media(content_hash_sha256);

-- 10. Package Availability & Capacity Table (FR-VEN-06, FR-VEN-07, SRS §11.4)
CREATE TABLE IF NOT EXISTS availability (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) REFERENCES vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'BLOCKED',
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_vendor_date UNIQUE (vendor_id, date)
);

CREATE TABLE IF NOT EXISTS availability_capacity (
  id VARCHAR(80) PRIMARY KEY,
  package_id VARCHAR(80) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slot VARCHAR(40) NOT NULL DEFAULT 'FULL_DAY',
  total_units INTEGER NOT NULL DEFAULT 1,
  held_units INTEGER NOT NULL DEFAULT 0,
  booked_units INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_pkg_date_slot UNIQUE (package_id, date, slot),
  CONSTRAINT chk_capacity_non_negative CHECK (
    total_units >= 0 AND
    held_units >= 0 AND
    booked_units >= 0 AND
    (held_units + booked_units) <= total_units
  )
);

CREATE INDEX IF NOT EXISTS idx_avail_capacity_pkg_date ON availability_capacity(package_id, date, slot);
CREATE INDEX IF NOT EXISTS idx_avail_capacity_vendor_date ON availability_capacity(vendor_id, date);

CREATE TABLE IF NOT EXISTS capacity_holds (
  id VARCHAR(80) PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL UNIQUE,
  package_id VARCHAR(80) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slot VARCHAR(40) NOT NULL DEFAULT 'FULL_DAY',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'BOOKED', 'RELEASED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS package_availability (
  id VARCHAR(80) PRIMARY KEY,
  package_id VARCHAR(80) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  avail_date DATE NOT NULL,
  slot_name VARCHAR(40) NOT NULL DEFAULT 'ALL_DAY',
  total_units INTEGER NOT NULL DEFAULT 1,
  held_units INTEGER NOT NULL DEFAULT 0,
  booked_units INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_package_date_slot UNIQUE (package_id, avail_date, slot_name)
);

CREATE INDEX IF NOT EXISTS idx_pkg_avail_lookup ON package_availability(package_id, avail_date, slot_name);
CREATE INDEX IF NOT EXISTS idx_pkg_avail_vendor_date ON package_availability(vendor_id, avail_date);

CREATE TABLE IF NOT EXISTS capacity_reservations (
  id VARCHAR(80) PRIMARY KEY,
  booking_id VARCHAR(80),
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package_id VARCHAR(80) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  avail_date DATE NOT NULL,
  slot_name VARCHAR(40) NOT NULL DEFAULT 'ALL_DAY',
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'HELD',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE capacity_reservations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_cap_res_booking ON capacity_reservations(booking_id);

-- 11. Vendor Wallet & Append-Only Ledger (FR-WAL-01..05, SRS §11.4)
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  entry_type VARCHAR(40) NOT NULL CHECK (entry_type IN ('TOPUP', 'LEAD_FEE', 'PENALTY_DEDUCTION', 'DISPUTE_REFUND')),
  amount_paise BIGINT NOT NULL,
  balance_after_paise BIGINT NOT NULL,
  reference_id VARCHAR(80),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_vendor ON wallet_ledger(vendor_id, created_at DESC);

-- 12. Notify-Me Requests (FR-SRCH-05, FR-NOT-02)
CREATE TABLE IF NOT EXISTS notify_requests (
  id VARCHAR(80) PRIMARY KEY,
  customer_id VARCHAR(80),
  user_id VARCHAR(80),
  vendor_id VARCHAR(80) REFERENCES vendors(id) ON DELETE CASCADE,
  package_id VARCHAR(80) REFERENCES packages(id) ON DELETE CASCADE,
  category_id VARCHAR(80) REFERENCES categories(id) ON DELETE SET NULL,
  event_item_id VARCHAR(80),
  event_date DATE,
  requested_date DATE,
  slot_name VARCHAR(40) DEFAULT 'ALL_DAY',
  required_qty INTEGER DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  notifications_sent_today INTEGER NOT NULL DEFAULT 0,
  last_notified_date DATE,
  notified_at TIMESTAMPTZ,
  disclaimer_text TEXT NOT NULL DEFAULT 'Notice: Capacity opening notification does not reserve availability. First confirmed booking secures the slot.',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notify_requests ADD COLUMN IF NOT EXISTS user_id VARCHAR(80);
ALTER TABLE notify_requests ADD COLUMN IF NOT EXISTS requested_date DATE;
ALTER TABLE notify_requests ADD COLUMN IF NOT EXISTS slot_name VARCHAR(40) DEFAULT 'ALL_DAY';
ALTER TABLE notify_requests ADD COLUMN IF NOT EXISTS required_qty INTEGER DEFAULT 1;
ALTER TABLE notify_requests ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
ALTER TABLE notify_requests ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE notify_requests ALTER COLUMN event_date DROP NOT NULL;
ALTER TABLE notify_requests ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE notify_requests DROP CONSTRAINT IF EXISTS notify_requests_status_check;

CREATE INDEX IF NOT EXISTS idx_notify_requests_lookup ON notify_requests(status, event_date, package_id, category_id);
CREATE INDEX IF NOT EXISTS idx_notify_requests_user ON notify_requests(user_id, status);

-- 13. Dynamic Admin CONFIG Table & Change History (FR-ADM-03, SRS §2.3)
CREATE TABLE IF NOT EXISTS configs (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by VARCHAR(80) NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS config_history (
  id VARCHAR(80) PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL REFERENCES configs(key) ON DELETE CASCADE,
  old_value TEXT,
  new_value TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  updated_by VARCHAR(80) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Immutable Audit Logs & Transactional Outbox (FR-ADM-02, SRS §11.3)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(80) PRIMARY KEY,
  actor_id VARCHAR(80) NOT NULL,
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80),
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id VARCHAR(80) PRIMARY KEY,
  topic VARCHAR(120) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ
);
