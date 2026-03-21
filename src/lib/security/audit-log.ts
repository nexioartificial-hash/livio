/**
 * Login audit logging.
 *
 * Logs authentication events to a `login_audit_log` table in Supabase.
 * This is best-effort — failures to log should never block the auth flow.
 *
 * Table DDL (run in Supabase SQL Editor):
 *
 * CREATE TABLE IF NOT EXISTS login_audit_log (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 *   email_attempted VARCHAR(255),
 *   event_type VARCHAR(50) NOT NULL,
 *   ip_address TEXT,
 *   user_agent TEXT,
 *   metadata JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Index for querying recent events by email (lockout checks)
 * CREATE INDEX idx_audit_email_event ON login_audit_log(email_attempted, event_type, created_at DESC);
 * -- Index for querying by user
 * CREATE INDEX idx_audit_user ON login_audit_log(user_id, created_at DESC);
 * -- Auto-delete logs older than 90 days (optional, via pg_cron)
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditEventType =
    | "login_success"
    | "login_failed"
    | "login_locked"
    | "password_reset_requested"
    | "password_reset_completed"
    | "password_changed"
    | "account_locked"
    | "token_reuse_detected"
    | "register_success"
    | "register_failed"
    | "logout";

interface AuditLogEntry {
    userId?: string;
    email: string;
    eventType: AuditEventType;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Best-effort — never throws.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        const admin = createAdminClient();
        await admin.from("login_audit_log").insert({
            user_id: entry.userId || null,
            email_attempted: entry.email.toLowerCase().trim(),
            event_type: entry.eventType,
            ip_address: entry.ip || null,
            user_agent: entry.userAgent?.substring(0, 500) || null,
            metadata: entry.metadata || {},
        });
    } catch (err) {
        // Best-effort: never let logging failures break auth flow
        console.error("[AuditLog] Failed to write:", err);
    }
}

/**
 * Count recent failed login attempts for an email within a time window.
 * Used for account lockout decisions.
 */
export async function countRecentFailedAttempts(
    email: string,
    windowMinutes: number = 15,
): Promise<number> {
    try {
        const admin = createAdminClient();
        const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

        const { count } = await admin
            .from("login_audit_log")
            .select("*", { count: "exact", head: true })
            .eq("email_attempted", email.toLowerCase().trim())
            .eq("event_type", "login_failed")
            .gte("created_at", since);

        return count ?? 0;
    } catch {
        return 0; // Fail open — don't lock out if we can't check
    }
}

/**
 * Check if an account is currently locked out due to excessive failed attempts.
 * Returns the number of minutes remaining if locked, or 0 if not locked.
 */
export async function getAccountLockoutMinutes(email: string): Promise<number> {
    try {
        const admin = createAdminClient();

        // Check if there was a recent lockout event
        const { data: lockEvent } = await admin
            .from("login_audit_log")
            .select("created_at")
            .eq("email_attempted", email.toLowerCase().trim())
            .eq("event_type", "account_locked")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!lockEvent) return 0;

        const lockedAt = new Date(lockEvent.created_at).getTime();
        const lockDurationMs = 15 * 60_000; // 15 minute lockout
        const unlockAt = lockedAt + lockDurationMs;
        const now = Date.now();

        if (now >= unlockAt) return 0;

        // Check if there was a successful login after the lock (manual unlock)
        const { data: successAfterLock } = await admin
            .from("login_audit_log")
            .select("id")
            .eq("email_attempted", email.toLowerCase().trim())
            .eq("event_type", "login_success")
            .gt("created_at", lockEvent.created_at)
            .limit(1)
            .maybeSingle();

        if (successAfterLock) return 0;

        return Math.ceil((unlockAt - now) / 60_000);
    } catch {
        return 0; // Fail open
    }
}
