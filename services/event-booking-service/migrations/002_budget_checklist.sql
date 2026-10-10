-- Migration 002: Event budget and checklist tables
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

CREATE INDEX IF NOT EXISTS idx_event_budget_event_id ON event_budget (event_id);

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

CREATE INDEX IF NOT EXISTS idx_event_checklist_event_id ON event_checklist (event_id);
CREATE INDEX IF NOT EXISTS idx_event_checklist_due_date ON event_checklist (due_date);
