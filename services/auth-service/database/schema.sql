-- BookMe Auth Service — schema for auth_db
-- This is the ONLY database the auth-service is allowed to touch.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(120)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255)  NOT NULL,
    role            user_role     NOT NULL DEFAULT 'CUSTOMER',
    status          user_status   NOT NULL DEFAULT 'PENDING',
    email_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Single-use tokens for email verification and password reset.
-- Kept separate from the JWT access token on purpose (see README).
CREATE TABLE IF NOT EXISTS auth_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL_VERIFY', 'PASSWORD_RESET')),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_type ON auth_tokens(type);
