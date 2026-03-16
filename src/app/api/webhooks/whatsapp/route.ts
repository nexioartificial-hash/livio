/**
 * /api/webhooks/whatsapp
 *
 * GET  — Verificación del webhook por Meta (hub.challenge).
 * POST — Recibe eventos: mensajes entrantes y actualizaciones de estado.
 *        Verifica HMAC-SHA256 con APP_SECRET.
 *        Guarda mensajes en whatsapp_messages.
 *
 * Configurar en Meta App Dashboard:
 *   Webhook URL: https://livio.app/api/webhooks/whatsapp
 *   Verify Token: valor de META_VERIFY_TOKEN en .env
 *   Suscribir a: messages, message_status_updates
 *
 * Este endpoint SIEMPRE responde 200 a Meta (evita reintentos).
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!;
const APP_SECRET = process.env.META_APP_SECRET!;

// ── Signature verification ───────────────────────────────────────────────────

function verifySignature(rawBody: string, signatureHeader: string): boolean {
    if (!signatureHeader.startsWith("sha256=")) return false;
    const received = signatureHeader.slice(7);
    const expected = crypto
        .createHmac("sha256", APP_SECRET)
        .update(rawBody, "utf8")
        .digest("hex");
    // Constant-time comparison
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, "hex"),
            Buffer.from(received, "hex")
        );
    } catch {
        return false;
    }
}

// ── GET — webhook verification ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
        console.log("[WA Webhook] Verified successfully");
        return new NextResponse(challenge, { status: 200 });
    }

    console.warn("[WA Webhook] Verification failed", { mode, token });
    return new NextResponse("Forbidden", { status: 403 });
}

// ── POST — receive events ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    let rawBody = "";

    try {
        rawBody = await req.text();

        // Verify signature
        const sig = req.headers.get("x-hub-signature-256") ?? "";
        if (APP_SECRET && !verifySignature(rawBody, sig)) {
            console.error("[WA Webhook] Invalid signature — rejecting");
            // Still return 200 so Meta doesn't disable the webhook,
            // but log it prominently.
            return new NextResponse("OK", { status: 200 });
        }

        const body = JSON.parse(rawBody);
        console.log("[WA Webhook] Received:", JSON.stringify(body).slice(0, 300));

        const admin = createAdminClient();

        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                if (change.field !== "messages") continue;

                const value = change.value;
                const phoneId: string = value.metadata?.phone_number_id ?? "";

                // Resolve clinic_id from phone_id
                const { data: conn } = await admin
                    .from("user_whatsapps")
                    .select("clinic_id")
                    .eq("phone_id", phoneId)
                    .single();

                const clinicId = conn?.clinic_id ?? null;

                // ── Inbound messages ─────────────────────────────
                for (const msg of value.messages ?? []) {
                    const record = {
                        clinic_id: clinicId,
                        phone_id: phoneId,
                        wamid: msg.id as string,
                        direction: "inbound" as const,
                        from_number: msg.from as string,
                        to_number: value.metadata?.display_phone_number ?? null,
                        type: msg.type as string,
                        body:
                            msg.type === "text"
                                ? (msg.text?.body ?? null)
                                : msg.type === "interactive"
                                ? JSON.stringify(msg.interactive)
                                : null,
                        status: "received",
                        timestamp: new Date(parseInt(msg.timestamp as string) * 1000).toISOString(),
                        raw_payload: msg,
                    };

                    const { error } = await admin
                        .from("whatsapp_messages")
                        .upsert(record, { onConflict: "wamid" });

                    if (error) {
                        console.error("[WA Webhook] Error saving message:", error.message);
                    } else {
                        console.log("[WA Webhook] Message saved:", msg.id, "from:", msg.from);
                    }
                }

                // ── Status updates ───────────────────────────────
                for (const status of value.statuses ?? []) {
                    await admin
                        .from("whatsapp_messages")
                        .update({ status: status.status })
                        .eq("wamid", status.id);

                    console.log("[WA Webhook] Status:", status.id, "→", status.status);
                }
            }
        }

        return new NextResponse("OK", { status: 200 });
    } catch (err: any) {
        console.error("[WA Webhook] Unhandled error:", err.message, rawBody.slice(0, 200));
        // Always 200 to Meta
        return new NextResponse("OK", { status: 200 });
    }
}

// Edge runtime for lower latency on webhook processing
export const runtime = "nodejs"; // Use nodejs for crypto module compatibility
