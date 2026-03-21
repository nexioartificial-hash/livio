"use server";

import { headers } from "next/headers";
import { checkRateLimit, LOGIN_IP_LIMIT, LOGIN_ACCOUNT_LIMIT, PASSWORD_RESET_LIMIT } from "@/lib/security/rate-limiter";
import { writeAuditLog, countRecentFailedAttempts, getAccountLockoutMinutes } from "@/lib/security/audit-log";
import { validatePassword } from "@/lib/security/password-validator";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ──────────────────────────────────────────────────

async function getClientInfo() {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
        || hdrs.get("x-real-ip")
        || "unknown";
    const userAgent = hdrs.get("user-agent") || "unknown";
    return { ip, userAgent };
}

// ─── Pre-Login Check ──────────────────────────────────────────
/**
 * Called BEFORE signInWithPassword on the client.
 * Checks rate limits and account lockout.
 * Returns { allowed: true } or { allowed: false, error: string }.
 */
export async function preLoginCheck(email: string): Promise<{
    allowed: boolean;
    error?: string;
    retryAfterSeconds?: number;
}> {
    const sanitizedEmail = email.toLowerCase().trim();
    const { ip } = await getClientInfo();

    // 1. IP-based rate limit: max 10 attempts/min
    const ipCheck = checkRateLimit(`login:ip:${ip}`, LOGIN_IP_LIMIT);
    if (!ipCheck.allowed) {
        return {
            allowed: false,
            error: "Demasiados intentos. Esperá un momento antes de reintentar.",
            retryAfterSeconds: Math.ceil(ipCheck.retryAfterMs / 1000),
        };
    }

    // 2. Account-based rate limit: max 5 attempts/15min per email
    const accountCheck = checkRateLimit(`login:email:${sanitizedEmail}`, LOGIN_ACCOUNT_LIMIT);
    if (!accountCheck.allowed) {
        return {
            allowed: false,
            error: "Demasiados intentos para esta cuenta. Intentá de nuevo en unos minutos.",
            retryAfterSeconds: Math.ceil(accountCheck.retryAfterMs / 1000),
        };
    }

    // 3. Account lockout check (persistent, from audit log)
    const lockoutMinutes = await getAccountLockoutMinutes(sanitizedEmail);
    if (lockoutMinutes > 0) {
        return {
            allowed: false,
            error: `Cuenta bloqueada temporalmente. Intentá de nuevo en ${lockoutMinutes} minutos.`,
            retryAfterSeconds: lockoutMinutes * 60,
        };
    }

    return { allowed: true };
}

// ─── Post-Login Result ────────────────────────────────────────
/**
 * Called AFTER signInWithPassword returns.
 * Logs the attempt and handles lockout escalation.
 */
export async function postLoginResult(
    email: string,
    success: boolean,
    userId?: string,
): Promise<{ locked?: boolean; lockoutMessage?: string }> {
    const sanitizedEmail = email.toLowerCase().trim();
    const { ip, userAgent } = await getClientInfo();

    if (success) {
        await writeAuditLog({
            userId,
            email: sanitizedEmail,
            eventType: "login_success",
            ip,
            userAgent,
        });
        return {};
    }

    // Failed login
    await writeAuditLog({
        email: sanitizedEmail,
        eventType: "login_failed",
        ip,
        userAgent,
        metadata: { userId: userId || null },
    });

    // Check if we need to lock the account (5+ failures in 15 min)
    const recentFailures = await countRecentFailedAttempts(sanitizedEmail, 15);

    if (recentFailures >= 5) {
        // Lock the account
        await writeAuditLog({
            email: sanitizedEmail,
            eventType: "account_locked",
            ip,
            userAgent,
            metadata: { failedAttempts: recentFailures, lockDurationMinutes: 15 },
        });

        // Send alert email (best-effort, don't block)
        sendLockoutAlertEmail(sanitizedEmail, ip).catch(() => {});

        return {
            locked: true,
            lockoutMessage: "Tu cuenta fue bloqueada temporalmente por seguridad. Revisá tu email.",
        };
    }

    return {};
}

// ─── Lockout Alert Email ──────────────────────────────────────
async function sendLockoutAlertEmail(email: string, ip: string): Promise<void> {
    try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return;

        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Livio Seguridad <seguridad@liviodental.com>",
                to: email,
                subject: "Alerta de seguridad — Intentos de acceso detectados",
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                        <h2 style="color: #1e293b;">Alerta de Seguridad</h2>
                        <p>Detectamos múltiples intentos de acceso fallidos a tu cuenta de Livio.</p>
                        <p><strong>IP origen:</strong> ${escapeHtml(ip)}</p>
                        <p><strong>Hora:</strong> ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
                        <p>Tu cuenta fue bloqueada temporalmente por 15 minutos como medida de protección.</p>
                        <p>Si no fuiste vos, te recomendamos <a href="https://app.liviodental.com/forgot-password">cambiar tu contraseña</a> inmediatamente.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                        <p style="color: #94a3b8; font-size: 12px;">Este email fue enviado automáticamente por el sistema de seguridad de Livio.</p>
                    </div>
                `,
            }),
        });
    } catch (err) {
        console.error("[Auth] Failed to send lockout alert email:", err);
    }
}

// ─── Password Reset Request ──────────────────────────────────
export async function requestPasswordReset(email: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const sanitizedEmail = email.toLowerCase().trim();
    const { ip, userAgent } = await getClientInfo();

    // Rate limit: max 3 per hour per email
    const rateCheck = checkRateLimit(`reset:${sanitizedEmail}`, PASSWORD_RESET_LIMIT);
    if (!rateCheck.allowed) {
        // Always return success to avoid email enumeration
        return { success: true };
    }

    // Always show same message regardless of whether email exists (prevents enumeration)
    await writeAuditLog({
        email: sanitizedEmail,
        eventType: "password_reset_requested",
        ip,
        userAgent,
    });

    // Use Supabase's built-in password reset (sends email with magic link)
    const admin = createAdminClient();
    // We use the admin client to generate a reset link without revealing if user exists
    const { data: userList } = await admin.auth.admin.listUsers();
    const userExists = userList?.users?.some(
        u => u.email?.toLowerCase() === sanitizedEmail
    );

    if (userExists) {
        // Supabase handles sending the reset email
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.liviodental.com"}/auth/reset-password`,
        });
    }

    return { success: true };
}

// ─── Validate Password (server-side) ─────────────────────────
export async function validatePasswordServer(
    password: string,
    email?: string,
    fullName?: string,
): Promise<{ valid: boolean; errors: string[]; score: number }> {
    const result = validatePassword(password, email, fullName);
    return { valid: result.valid, errors: result.errors, score: result.score };
}

// ─── HTML Escape Helper ──────────────────────────────────────
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
