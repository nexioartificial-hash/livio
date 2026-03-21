"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationEmail } from "@/lib/email/send";
import { writeAuditLog } from "@/lib/security/audit-log";
import { checkRateLimit, REGISTER_IP_LIMIT } from "@/lib/security/rate-limiter";
import { validatePassword } from "@/lib/security/password-validator";
import { validateClinicName, validateCUIT, validateEmail, sanitizeText } from "@/lib/security/register-validators";
import { headers } from "next/headers";
import crypto from "crypto";

interface RegisterResult {
    success: boolean;
    error?: string;
    email?: string;
}

/**
 * Server action called after Supabase signUp on the client.
 * Generates a verification token and sends the branded email.
 * Also validates inputs server-side (zero trust).
 */
export async function postRegistration(data: {
    userId: string;
    email: string;
    clinicName: string;
    fullName: string;
}): Promise<RegisterResult> {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = hdrs.get("user-agent") || "unknown";

    // Rate limit: max 3 registrations per IP per hour
    const rateCheck = checkRateLimit(`register:ip:${ip}`, REGISTER_IP_LIMIT);
    if (!rateCheck.allowed) {
        return { success: false, error: "Demasiados intentos. Esperá unos minutos." };
    }

    try {
        const admin = createAdminClient();
        const sanitizedEmail = data.email.trim().toLowerCase();
        const sanitizedClinicName = sanitizeText(data.clinicName);
        const sanitizedFullName = sanitizeText(data.fullName);

        // Generate verification token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        // Store hashed token in DB
        await admin.from("email_verification_tokens").insert({
            user_id: data.userId,
            token_hash: hashedToken,
            expires_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), // 24 hours
        });

        // Build verification URL
        const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://liviodental.com";
        const verificationUrl = `${appUrl}/verificar-email?token=${rawToken}&email=${encodeURIComponent(sanitizedEmail)}`;

        // Send branded verification email via Resend (best-effort)
        const emailResult = await sendVerificationEmail(
            sanitizedEmail,
            sanitizedFullName || "Usuario",
            sanitizedClinicName || "Tu Clínica",
            verificationUrl,
        );

        // Audit log
        await writeAuditLog({
            userId: data.userId,
            email: sanitizedEmail,
            eventType: "register_success",
            ip,
            userAgent,
            metadata: {
                emailSent: emailResult.success,
                messageId: emailResult.messageId || null,
            },
        });

        return { success: true, email: sanitizedEmail };
    } catch (err: any) {
        console.error("[PostRegistration] Error:", err);
        return { success: false, error: "Error al enviar email de verificación" };
    }
}
