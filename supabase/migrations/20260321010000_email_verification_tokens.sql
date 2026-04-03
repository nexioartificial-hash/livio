-- Email verification tokens table
-- Stores SHA-256 hashed tokens for email verification flow

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT idx_verification_token_hash UNIQUE (token_hash)
);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_verification_expires
    ON email_verification_tokens(expires_at) WHERE used_at IS NULL;

-- Index for finding tokens by user
CREATE INDEX IF NOT EXISTS idx_verification_user
    ON email_verification_tokens(user_id, created_at DESC);

-- RLS: only service_role can access
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
