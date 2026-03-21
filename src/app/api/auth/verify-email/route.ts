import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { sendWelcomeEmail } from "@/lib/email/send";
import { headers } from "next/headers";
import crypto from "crypto";

/**
 * GET /api/auth/verify-email?token=xxx
 * Verifies the email using our custom token (stored hashed in DB).
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // Validate token format
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        return NextResponse.json({ success: false, message: "Token inválido" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const admin = createAdminClient();

    try {
        // Find the token
        const { data: record } = await admin
            .from("email_verification_tokens")
            .select("*, user_id")
            .eq("token_hash", tokenHash)
            .maybeSingle();

        if (!record) {
            return NextResponse.json({
                success: false,
                message: "El link de verificación no es válido o ya fue utilizado",
            }, { status: 400 });
        }

        // Check expiration
        if (new Date(record.expires_at) < new Date()) {
            return NextResponse.json({
                success: false,
                message: "El link de verificación expiró. Solicitá uno nuevo.",
                code: "TOKEN_EXPIRED",
            }, { status: 400 });
        }

        // Check if already used
        if (record.used_at) {
            return NextResponse.json({
                success: false,
                message: "Este link ya fue utilizado",
            }, { status: 400 });
        }

        // Check if user's email is already verified
        const { data: userData } = await admin.auth.admin.getUserById(record.user_id);
        if (userData?.user?.email_confirmed_at) {
            // Mark token as used anyway
            await admin.from("email_verification_tokens").update({ used_at: new Date().toISOString() }).eq("id", record.id);
            return NextResponse.json({
                success: true,
                message: "Tu email ya estaba verificado. Podés iniciar sesión.",
                alreadyVerified: true,
            });
        }

        // Verify the email via Supabase Admin API
        const { error: updateError } = await admin.auth.admin.updateUserById(record.user_id, {
            email_confirm: true,
        });

        if (updateError) {
            console.error("[VerifyEmail] Failed to confirm:", updateError);
            return NextResponse.json({ success: false, message: "Error al verificar" }, { status: 500 });
        }

        // Mark token as used
        await admin.from("email_verification_tokens").update({ used_at: new Date().toISOString() }).eq("id", record.id);

        // Audit log
        const hdrs = await headers();
        await writeAuditLog({
            userId: record.user_id,
            email: userData?.user?.email || "",
            eventType: "password_reset_completed", // reusing event type for verification
            ip: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        });

        // Send welcome email (best-effort)
        if (userData?.user?.email) {
            const { data: prof } = await admin.from("professional").select("full_name").eq("id", record.user_id).maybeSingle();
            sendWelcomeEmail(userData.user.email, prof?.full_name || "").catch(() => {});
        }

        return NextResponse.json({
            success: true,
            message: "¡Email verificado! Ya podés iniciar sesión.",
        });
    } catch (err) {
        console.error("[VerifyEmail] Error:", err);
        return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
    }
}
