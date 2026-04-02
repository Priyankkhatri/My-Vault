-- My-Vault Initial Database Schema
-- Run against PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (zero-knowledge: we store auth_hash, never the password)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    auth_hash VARCHAR(128) NOT NULL,
    kdf_salt TEXT NOT NULL,
    kdf_params JSONB NOT NULL DEFAULT '{"iterations":600000}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encrypted vault blobs (server sees only ciphertext)
CREATE TABLE vault_items (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL,
    iv TEXT NOT NULL,
    item_type VARCHAR(20) NOT NULL,
    metadata JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vault_items_user ON vault_items(user_id);

-- Device sessions for multi-device tracking
CREATE TABLE device_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    refresh_token_hash VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI quota tracking (resets daily)
CREATE TABLE ai_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    quota_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, feature, quota_date)
);

-- Audit log for security events
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at DESC);
