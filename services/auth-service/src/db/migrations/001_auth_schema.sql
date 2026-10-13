-- 001_auth_schema.sql (UP Migration)
-- Auth service database schema conforming to BookMe SRS §4 and §11.4

-- 1. Users Table (SRS §4 Data Model: id, role, phone (encrypted), email, password hash, status)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_encrypted TEXT NOT NULL,
    phone_hash VARCHAR(64) UNIQUE NOT NULL,
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

-- 2. OTP Verifications Table (FR-ONB-01)
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

-- 3. Phone Lockouts Table (FR-ONB-01: 5 failed OTPs lock account/phone for 15 minutes)
CREATE TABLE IF NOT EXISTS phone_lockouts (
    phone_hash VARCHAR(64) PRIMARY KEY,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Verification Tokens Table (Issued on OTP verify, consumed on register)
CREATE TABLE IF NOT EXISTS verification_tokens (
    token VARCHAR(64) PRIMARY KEY,
    phone_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_phone ON verification_tokens(phone_hash);

-- 5. Refresh Tokens Table (Hashed tokens with family tracking for reuse detection)
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
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- 6. Agreement Acceptances Table (Append-only audit log: FR-ONB-04 & FR-ONB-05)
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

CREATE INDEX IF NOT EXISTS idx_agreements_user ON agreement_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_agreements_type ON agreement_acceptances(agreement_type);
