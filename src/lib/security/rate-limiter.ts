/**
 * In-memory rate limiter for auth endpoints.
 *
 * Uses a sliding window approach with per-key counters.
 * NOTE: This works per-instance. On Vercel serverless, each cold start
 * gets a fresh map. For production scale, replace with Redis (Upstash).
 * However, this still provides meaningful protection against burst attacks
 * within a single instance's lifetime.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number; // Unix timestamp in ms
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds to prevent memory leaks
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key);
    }
}

interface RateLimitConfig {
    /** Max requests allowed within the window */
    maxAttempts: number;
    /** Window duration in milliseconds */
    windowMs: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (e.g., "login:ip:1.2.3.4" or "login:email:user@test.com")
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    cleanup();

    const now = Date.now();
    const entry = store.get(key);

    // No previous entry or window expired — allow and start new window
    if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
    }

    // Window still active
    if (entry.count < config.maxAttempts) {
        entry.count++;
        return { allowed: true, remaining: config.maxAttempts - entry.count, retryAfterMs: 0 };
    }

    // Rate limit exceeded
    return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.resetAt - now,
    };
}

// ─── Preconfigured rate limiters ────────────────────────────────

/** Login attempts: max 10 per minute per IP */
export const LOGIN_IP_LIMIT: RateLimitConfig = {
    maxAttempts: 10,
    windowMs: 60_000,
};

/** Login attempts: max 5 per 15 minutes per email/account */
export const LOGIN_ACCOUNT_LIMIT: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60_000,
};

/** Password reset: max 3 per hour per email */
export const PASSWORD_RESET_LIMIT: RateLimitConfig = {
    maxAttempts: 3,
    windowMs: 60 * 60_000,
};

/** Registration: max 3 per hour per IP */
export const REGISTER_IP_LIMIT: RateLimitConfig = {
    maxAttempts: 3,
    windowMs: 60 * 60_000,
};
