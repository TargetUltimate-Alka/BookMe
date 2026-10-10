-- Migration 001: Events table
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

CREATE INDEX IF NOT EXISTS idx_events_customer_id ON events (customer_id);
CREATE INDEX IF NOT EXISTS idx_events_customer_date ON events (customer_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
