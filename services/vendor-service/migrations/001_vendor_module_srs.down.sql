-- =============================================================================
-- Migration 001 (DOWN): Reversible rollback of SRS Vendor Module additions
-- =============================================================================

DROP TABLE IF EXISTS outbox_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS config_history CASCADE;
DROP TABLE IF EXISTS configs CASCADE;
DROP TABLE IF EXISTS notify_requests CASCADE;
DROP TABLE IF EXISTS wallet_ledger CASCADE;
DROP TABLE IF EXISTS capacity_holds CASCADE;
DROP TABLE IF EXISTS availability_capacity CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS package_addons CASCADE;
DROP TABLE IF EXISTS vendor_status_history CASCADE;
DROP TABLE IF EXISTS vendor_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
