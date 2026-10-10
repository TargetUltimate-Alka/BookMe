-- Migration 003: Bookings table with state management and constraints
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
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED')),
  vendor_response_due_at TIMESTAMP WITH TIME ZONE,
  payment_due_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_status ON bookings (vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings (event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (booking_date);

-- Partial unique index preventing a second active booking for the same service in the same event
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_unique
  ON bookings (event_id, vendor_id, service_id)
  WHERE status IN ('PENDING', 'ACCEPTED', 'CONFIRMED');
