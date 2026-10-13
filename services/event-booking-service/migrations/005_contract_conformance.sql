-- Migration 005: Contract Conformance & Advanced Booking Lifecycle
-- UP MIGRATION

-- 1. Extend bookings table with monetary paise columns, delivery choices, and GPS check-in fields
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS event_item_id UUID,
  ADD COLUMN IF NOT EXISTS agreed_amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS deposit_amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS balance_amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS security_deposit_paise BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rush_surcharge_paise BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_choice VARCHAR(50) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS delivery_address JSONB,
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS deposit_due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS balance_due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS addon_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update status check constraint to include all 12 contract states (plus backwards-compat aliases)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'REQUESTED',
    'NEGOTIATING',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CONFIRMED',
    'CANCELLED_BY_CUSTOMER',
    'CANCELLED_BY_VENDOR',
    'IN_PROGRESS',
    'NO_SHOW',
    'COMPLETED',
    'DISPUTED',
    'PENDING',
    'CANCELLED'
  ));

CREATE INDEX IF NOT EXISTS idx_bookings_event_item_id ON bookings (event_item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_due ON bookings (deposit_due_at);
CREATE INDEX IF NOT EXISTS idx_bookings_balance_due ON bookings (balance_due_at);

-- 2. Structured Counter-Offers table (FR-BKG-03)
CREATE TABLE IF NOT EXISTS counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  proposed_by_role VARCHAR(50) NOT NULL,
  amount_paise BIGINT NOT NULL,
  counter_number INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_counter_offers_booking ON counter_offers (booking_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_status ON counter_offers (status);

-- 3. Notify-Me alert requests table (FR-PLAN-03, FR-NOT-02)
CREATE TABLE IF NOT EXISTS notify_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(255) NOT NULL,
  event_item_id UUID,
  package_id UUID,
  category_id UUID,
  target_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'NOTIFIED', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notify_requests_customer ON notify_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_notify_requests_date ON notify_requests (target_date);

-- 4. Idempotency Keys table for replay protection (ADR-005)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key VARCHAR(255) PRIMARY KEY,
  request_path VARCHAR(255) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_keys (created_at);

-- ============================================================================
-- DOWN MIGRATION (for rollback verification)
-- ============================================================================
-- DROP TABLE IF EXISTS idempotency_keys;
-- DROP TABLE IF EXISTS notify_requests;
-- DROP TABLE IF EXISTS counter_offers;
-- ALTER TABLE bookings
--   DROP COLUMN IF EXISTS notes,
--   DROP COLUMN IF EXISTS addon_ids,
--   DROP COLUMN IF EXISTS quantity,
--   DROP COLUMN IF EXISTS balance_due_at,
--   DROP COLUMN IF EXISTS deposit_due_at,
--   DROP COLUMN IF EXISTS check_in_longitude,
--   DROP COLUMN IF EXISTS check_in_latitude,
--   DROP COLUMN IF EXISTS check_in_at,
--   DROP COLUMN IF EXISTS delivery_address,
--   DROP COLUMN IF EXISTS delivery_choice,
--   DROP COLUMN IF EXISTS rush_surcharge_paise,
--   DROP COLUMN IF EXISTS security_deposit_paise,
--   DROP COLUMN IF EXISTS balance_amount_paise,
--   DROP COLUMN IF EXISTS deposit_amount_paise,
--   DROP COLUMN IF EXISTS agreed_amount_paise,
--   DROP COLUMN IF EXISTS event_item_id;
