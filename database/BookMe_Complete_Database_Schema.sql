-- =============================================================================
-- BookMe Complete Platform Database Schema (PostgreSQL 16)
-- Conforming to SRS v1.0, Distributed Microservices Architecture & DPDP Act
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- 1. AUTH SERVICE SCHEMA (auth_db)
-- =============================================================================

-- 1.1 Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_encrypted TEXT NOT NULL,
    phone_hash VARCHAR(64) UNIQUE NOT NULL,      -- Deterministic HMAC-SHA-256 blind index
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (
        role IN ('customer', 'vendor', 'superAdmin', 'verifier', 'supportAgent', 'financeAdmin', 'contentModerator')
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'DEACTIVATED')),
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 1.2 OTP Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id VARCHAR(50) PRIMARY KEY,
    phone_hash VARCHAR(64) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed BOOLEAN DEFAULT FALSE,
    cooldown_until TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_hash ON otp_verifications(phone_hash);

-- 1.3 Phone Lockouts (5 failed attempts locks for 15 mins)
CREATE TABLE IF NOT EXISTS phone_lockouts (
    phone_hash VARCHAR(64) PRIMARY KEY,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Verification Tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
    token VARCHAR(64) PRIMARY KEY,
    phone_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Refresh Tokens (Family tracking for reuse detection)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    family_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);

-- 1.6 Agreement Acceptances (Append-only audit)
CREATE TABLE IF NOT EXISTS agreement_acceptances (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    agreement_type VARCHAR(50) NOT NULL CHECK (
        agreement_type IN ('CUSTOMER_DAMAGE_LIABILITY', 'VENDOR_SERVICE_AGREEMENT')
    ),
    version VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. VENDOR SERVICE SCHEMA (vendor_db)
-- =============================================================================

-- 2.1 Categories Hierarchy (60 specializations across 8 parent domains)
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

-- 2.2 Vendors Profile & KYC Tracking
CREATE TABLE IF NOT EXISTS vendors (
  id VARCHAR(80) PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'catering',
  description TEXT,
  location VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  service_radius_km INTEGER NOT NULL DEFAULT 25,
  service_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  kyc_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
    CHECK (kyc_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  verified BOOLEAN DEFAULT FALSE,
  is_demo BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT NULL,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  wallet_balance_paise BIGINT NOT NULL DEFAULT 100000,
  response_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_lat_lng ON vendors(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(rating DESC NULLS LAST);

-- 2.3 Vendor Category Mapping
CREATE TABLE IF NOT EXISTS vendor_categories (
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id VARCHAR(80) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vendor_id, category_id)
);

-- 2.4 Vendor KYC Records (DPDP Act Compliance: Zero Raw Aadhaar)
CREATE TABLE IF NOT EXISTS vendor_kyc_records (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) UNIQUE NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  digilocker_ref_enc TEXT,
  aadhaar_last4 VARCHAR(10),                       -- Only masked last 4 (e.g. XXXX-XXXX-1234)
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

-- 2.5 Vendor Legal Agreements
CREATE TABLE IF NOT EXISTS vendor_agreements (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  agreement_version VARCHAR(30) NOT NULL,
  document_hash VARCHAR(128),
  ip_address VARCHAR(64),
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.6 Packages Table (64-bit Integer Paise & Tiers)
CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) REFERENCES vendors(id) ON DELETE CASCADE,
  category_id VARCHAR(80) REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(30) NOT NULL DEFAULT 'Standard' CHECK (tier IN ('Basic', 'Standard', 'Premium')),
  description TEXT,
  base_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (base_price_paise >= 0),
  pricing_unit VARCHAR(30) NOT NULL DEFAULT 'per_day' CHECK (pricing_unit IN ('per_day', 'per_hour', 'per_plate', 'flat')),
  inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  guest_min INTEGER DEFAULT 1,
  guest_max INTEGER DEFAULT 500,
  duration_hours INTEGER DEFAULT 8,
  overtime_rate_paise BIGINT NOT NULL DEFAULT 0 CHECK (overtime_rate_paise >= 0),
  capacity_units INTEGER NOT NULL DEFAULT 1 CHECK (capacity_units >= 0),
  security_deposit_paise BIGINT NOT NULL DEFAULT 0 CHECK (security_deposit_paise >= 0),
  gst_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  hsn_sac_code VARCHAR(20) NOT NULL DEFAULT '998596',
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  compliance_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_packages_vendor_status ON packages(vendor_id, status);

-- 2.7 Package Add-ons
CREATE TABLE IF NOT EXISTS package_addons (
  id VARCHAR(80) PRIMARY KEY,
  package_id VARCHAR(80) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  pricing_basis VARCHAR(40) NOT NULL DEFAULT 'flat'
    CHECK (pricing_basis IN ('flat', 'per_hour', 'per_day', 'per_plate', 'per_km', 'per_unit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 Atomic Calendar Capacity (No Race Condition)
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

-- 2.9 Media Assets (SHA-256 Anti-Fraud Hash)
CREATE TABLE IF NOT EXISTS media_assets (
  id VARCHAR(80) PRIMARY KEY,
  vendor_id VARCHAR(80) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package_id VARCHAR(80) REFERENCES packages(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(60) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4')),
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 20971520),
  sha256_checksum VARCHAR(64) NOT NULL,
  storage_url TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_assets_sha256 ON media_assets(sha256_checksum);

-- 2.10 Vendor Wallet & Append-Only Ledger
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

-- 2.11 Outbox Events (RabbitMQ transactional relay)
CREATE TABLE IF NOT EXISTS outbox_events (
  id VARCHAR(80) PRIMARY KEY,
  topic VARCHAR(120) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ
);

-- =============================================================================
-- 3. EVENT & BOOKING SERVICE SCHEMA (event_booking_db)
-- =============================================================================

-- 3.1 Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_date DATE NOT NULL,
  budget DECIMAL(15, 2) NOT NULL,
  guest_count INTEGER NOT NULL,
  city VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_customer ON events(customer_id);

-- 3.2 Event Budget
CREATE TABLE IF NOT EXISTS event_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  planned_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  actual_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_event_budget_category UNIQUE (event_id, category)
);

-- 3.3 Event Checklist
CREATE TABLE IF NOT EXISTS event_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  task VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  due_date DATE,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.4 Bookings Table (12 Lifecycle States & Snapshots)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  customer_id VARCHAR(255) NOT NULL,
  vendor_id VARCHAR(255) NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  package_id VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  booking_date DATE NOT NULL,
  vendor_name_snapshot VARCHAR(255) NOT NULL,
  package_name_snapshot VARCHAR(255),
  price_snapshot DECIMAL(15, 2) NOT NULL,
  agreed_amount_paise BIGINT,
  deposit_amount_paise BIGINT,
  balance_amount_paise BIGINT,
  security_deposit_paise BIGINT DEFAULT 0,
  rush_surcharge_paise BIGINT DEFAULT 0,
  delivery_choice VARCHAR(50) DEFAULT 'NONE',
  delivery_address JSONB,
  check_in_at TIMESTAMP WITH TIME ZONE,
  check_in_latitude DOUBLE PRECISION,
  check_in_longitude DOUBLE PRECISION,
  status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED' CHECK (
    status IN (
      'REQUESTED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXPIRED',
      'CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_VENDOR',
      'IN_PROGRESS', 'NO_SHOW', 'COMPLETED', 'DISPUTED'
    )
  ),
  vendor_response_due_at TIMESTAMP WITH TIME ZONE,
  deposit_due_at TIMESTAMP WITH TIME ZONE,
  balance_due_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_status ON bookings(vendor_id, status);

-- 3.5 Counter-Offers (Max 3 rounds negotiation)
CREATE TABLE IF NOT EXISTS counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  proposed_by_role VARCHAR(50) NOT NULL,
  amount_paise BIGINT NOT NULL,
  counter_number INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.6 Booking Status History
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.7 Idempotency Keys (API Replay Protection)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key VARCHAR(255) PRIMARY KEY,
  request_path VARCHAR(255) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. PAYMENT & FEEDBACK SERVICE SCHEMA (payment_feedback_db)
-- =============================================================================

-- 4.1 Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  method VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  gateway_ref VARCHAR(128),
  auth_challenge JSONB,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.2 Payouts Table (Escrow Release to Vendors)
CREATE TABLE IF NOT EXISTS payouts (
  id VARCHAR(64) PRIMARY KEY,
  vendor_id VARCHAR(64) NOT NULL,
  booking_id VARCHAR(64) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'processed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.3 Reviews Table (Unique 1 review per booking)
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  booking_id VARCHAR(64) UNIQUE NOT NULL,
  vendor_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4.4 Complaints / Disputes Table
CREATE TABLE IF NOT EXISTS complaints (
  id VARCHAR(64) PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 5. ADMIN SERVICE SCHEMA (admin_db)
-- =============================================================================

-- 5.1 Admin Configs (Dynamic runtime settings)
CREATE TABLE IF NOT EXISTS admin_configs (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 Admin Config Change History
CREATE TABLE IF NOT EXISTS admin_config_history (
  id VARCHAR(100) PRIMARY KEY,
  key VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  change_reason TEXT,
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.3 Immutable Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id VARCHAR(100) PRIMARY KEY,
  actor_id VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.4 Vendor Enforcement Ladder
CREATE TABLE IF NOT EXISTS admin_vendor_enforcements (
  id VARCHAR(100) PRIMARY KEY,
  vendor_id VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  case_notes TEXT,
  applied_by VARCHAR(100),
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
