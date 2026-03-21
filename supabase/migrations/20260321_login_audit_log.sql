-- Login Audit Log table for tracking authentication events
-- Used for: account lockout, security alerts, compliance

CREATE TABLE IF NOT EXISTS login_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email_attempted VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    -- Possible event_types:
    --   login_success, login_failed, login_locked, account_locked,
    --   password_reset_requested, password_reset_completed,
    --   password_changed, token_reuse_detected,
    --   register_success, register_failed, logout
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for checking recent failed attempts by email (lockout logic)
CREATE INDEX IF NOT EXISTS idx_audit_email_event
    ON login_audit_log(email_attempted, event_type, created_at DESC);

-- Index for querying user activity
CREATE INDEX IF NOT EXISTS idx_audit_user
    ON login_audit_log(user_id, created_at DESC);

-- Index for event type filtering (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_audit_event_type
    ON login_audit_log(event_type, created_at DESC);

-- Auto-cleanup: delete logs older than 90 days (run via pg_cron or manual job)
-- To enable with pg_cron:
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 * * *',
--     $$DELETE FROM login_audit_log WHERE created_at < NOW() - INTERVAL '90 days'$$
-- );

-- RLS: only service_role can read/write this table
ALTER TABLE login_audit_log ENABLE ROW LEVEL SECURITY;

-- No public access policies — only accessible via service_role (admin client)
