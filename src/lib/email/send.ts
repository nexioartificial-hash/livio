/**
 * Email sending utilities using Resend.
 * Best-effort: failures are logged but never block the auth flow.
 */

import { Resend } from "resend";
import {
    verificationEmailHTML, verificationEmailText,
    welcomeEmailHTML, lockoutAlertHTML,
    passwordResetHTML, passwordChangedHTML,
    supportTicketNotificationHTML, supportTicketNotificationText,
    supportTicketReplyHTML, supportTicketReplyText,
    dailyFinanceReportHTML, monthlyFinanceReportHTML,
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
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Email] Send failed:", message);
        return { success: false, error: message };
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

export async function sendSupportNotification(
    ticketId: string,
    subject: string,
    category: string,
    priority: string,
    message: string,
    clinicName: string,
    userName: string,
    userEmail: string,
): Promise<SendResult> {
    return send(
        "soporte@liviodental.com",
        `[Ticket #${ticketId.slice(0, 8)}] ${subject} — ${clinicName}`,
        supportTicketNotificationHTML(ticketId, subject, category, priority, message, clinicName, userName, userEmail),
        supportTicketNotificationText(ticketId, subject, category, priority, message, clinicName, userName, userEmail),
        [{ name: "type", value: "support-notification" }],
    );
}

export async function sendSupportReply(
    to: string,
    userName: string,
    subject: string,
    replyMessage: string,
    ticketId: string,
): Promise<SendResult> {
    const ticketUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://liviodental.com"}/soporte/${ticketId}`;
    return send(
        to,
        `Re: ${subject} — Livio Soporte`,
        supportTicketReplyHTML(userName, subject, replyMessage, ticketUrl),
        supportTicketReplyText(userName, subject, replyMessage, ticketUrl),
        [{ name: "type", value: "support-reply" }],
    );
}

export async function sendDailyFinanceReport(
    to: string,
    date: string,
    mrr: string,
    activeCount: number,
    failedPayments: { clinic_name: string; amount: string; created_at: string }[],
    cancelations: { clinic_name: string; canceled_at: string }[],
    trialsExpiring: { clinic_name: string; trial_ends_at: string }[],
    newCustomers: { clinic_name: string; amount: string; created_at: string }[],
): Promise<SendResult> {
    return send(
        to,
        `[Livio Finanzas] Reporte diario — ${date}`,
        dailyFinanceReportHTML(date, mrr, activeCount, failedPayments, cancelations, trialsExpiring, newCustomers),
        undefined,
        [{ name: "type", value: "finance-daily" }],
    );
}

export async function sendMonthlyFinanceReport(
    to: string,
    monthLabel: string,
    mrrStart: string,
    mrrEnd: string,
    mrrChange: string,
    arr: string,
    churnRate: string,
    trialConversion: string,
    ltv: string,
    totalRevenue: string,
    failedCount: number,
    startActive: number,
    endActive: number,
    cancelCount: number,
    newPaidCount: number,
    movements: { clinic_name: string; event_label: string; amount: string; date: string }[],
): Promise<SendResult> {
    return send(
        to,
        `[Livio Finanzas] Reporte mensual — ${monthLabel}`,
        monthlyFinanceReportHTML(monthLabel, mrrStart, mrrEnd, mrrChange, arr, churnRate, trialConversion, ltv, totalRevenue, failedCount, startActive, endActive, cancelCount, newPaidCount, movements),
        undefined,
        [{ name: "type", value: "finance-monthly" }],
    );
}
