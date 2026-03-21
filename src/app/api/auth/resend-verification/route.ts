import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationEmail } from "@/lib/email/send";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { headers } from "next/headers";
import crypto from "crypto";

const RESEND_LIMIT = { maxAttempts: 3, windowMs: 60 * 60_000 }; // 3 per hour

/**
 * POST /api/auth/resend-verification
 * Resends the verification email. Never reveals if the email exists.
 */
export async function POST(req: Request) {
    const genericResponse = {
        success: true,
        message: "Si el email está registrado, recibirás un nuevo link de verificación.",
    };

    try {
        const { email } = await req.json();
        if (!email || typeof email !== "string") {
            return NextResponse.json(genericResponse);
        }

        const sanitizedEmail = email.trim().toLowerCase();

        // Rate limit
        const hdrs = await headers();
        const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rateCheck = checkRateLimit(`resend-verify:${sanitizedEmail}`, RESEND_LIMIT);
        if (!rateCheck.allowed) {
            return NextResponse.json({
                success: false,
                message: "Ya enviamos varios emails. Revisá tu bandeja de spam o esperá un rato.",
            }, { status: 429 });
        }

        const admin = createAdminClient();

        // Find user by email
        const { data: userList } = await admin.auth.admin.listUsers();
        const user = userList?.users?.find(u => u.email?.toLowerCase() === sanitizedEmail);

        // If user doesn't exist or is already verified, return generic response
        if (!user || user.email_confirmed_at) {
            return NextResponse.json(genericResponse);
        }

        // Invalidate previous tokens
        await admin.from("email_verification_tokens")
            .update({ used_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .is("used_at", null);

        // Generate new token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        await admin.from("email_verification_tokens").insert({
            user_id: user.id,
            token_hash: hashedToken,
            expires_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        });

        // Get user's clinic name
        const { data: prof } = await admin.from("professional").select("full_name").eq("id", user.id).maybeSingle();
        const clinicName = user.user_metadata?.clinic_name || "Tu Clínica";
        const userName = prof?.full_name || user.user_metadata?.full_name || "Usuario";

        const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://liviodental.com";
        const verificationUrl = `${appUrl}/verificar-email?token=${rawToken}&email=${encodeURIComponent(sanitizedEmail)}`;

        await sendVerificationEmail(sanitizedEmail, userName, clinicName, verificationUrl);

        return NextResponse.json(genericResponse);
    } catch (err) {
        console.error("[ResendVerification] Error:", err);
        return NextResponse.json(genericResponse);
    }
}
