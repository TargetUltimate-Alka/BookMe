-- 001_auth_schema_down.sql (DOWN Migration)
-- Reversible rollback for auth service database schema

DROP TABLE IF EXISTS phone_lockouts CASCADE;
DROP TABLE IF EXISTS agreement_acceptances CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS otp_verifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;
