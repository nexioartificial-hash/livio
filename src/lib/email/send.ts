/**
 * Email sending utilities using Resend.
 * Best-effort: failures are logged but never block the auth flow.
 */

import { Resend } from "resend";
import {
    verificationEmailHTML, verificationEmailText,
    welcomeEmailHTML, lockoutAlertHTML,
    passwordResetHTML, passwordChangedHTML,
} from "./templates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
const FROM = process.env.RESEND_FROM_EMAIL || "Livio <onboarding@resend.dev>";
const REPLY_TO = "soporte@liviodental.com";

interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

async function send(to: string, subject: string, html: string, text?: string, tags?: { name: string; value: string }[]): Promise<SendResult> {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to: [to],
            replyTo: REPLY_TO,
            subject,
            html,
            text,
            tags: [
                ...(tags || []),
                { name: "environment", value: process.env.NODE_ENV || "development" },
            ],
        });

        if (error) {
            console.error("[Email] Resend error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, messageId: data?.id };
    } catch (err: any) {
        console.error("[Email] Send failed:", err.message);
        return { success: false, error: err.message };
    }
}

// ─── Public API ──────────────────────────────────────────────

export async function sendVerificationEmail(
    to: string, userName: string, clinicName: string, verificationUrl: string,
): Promise<SendResult> {
    return send(
        to,
        "¡Bienvenido a Livio! Confirmá tu cuenta",
        verificationEmailHTML(userName, clinicName, verificationUrl),
        verificationEmailText(userName, clinicName, verificationUrl),
        [{ name: "type", value: "verification" }],
    );
}

export async function sendWelcomeEmail(to: string, userName: string): Promise<SendResult> {
    return send(
        to,
        "¡Bienvenido a Livio! Tu clínica está lista",
        welcomeEmailHTML(userName),
        undefined,
        [{ name: "type", value: "welcome" }],
    );
}

export async function sendLockoutAlert(to: string, ip: string): Promise<SendResult> {
    return send(
        to,
        "Alerta de seguridad — Intentos de acceso a tu cuenta",
        lockoutAlertHTML(ip),
        undefined,
        [{ name: "type", value: "lockout" }],
    );
}

export async function sendPasswordResetEmail(
    to: string, userName: string, resetUrl: string,
): Promise<SendResult> {
    return send(
        to,
        "Restablecé tu contraseña de Livio",
        passwordResetHTML(userName, resetUrl),
        undefined,
        [{ name: "type", value: "password-reset" }],
    );
}

export async function sendPasswordChangedEmail(to: string, userName: string): Promise<SendResult> {
    return send(
        to,
        "Tu contraseña fue actualizada",
        passwordChangedHTML(userName),
        undefined,
        [{ name: "type", value: "password-changed" }],
    );
}
