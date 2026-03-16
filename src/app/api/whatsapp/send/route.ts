/**
 * POST /api/whatsapp/send
 * Envía un mensaje de texto o template por WhatsApp Business API.
 *
 * Body (text):
 *   { phone_id, to, type: "text", message }
 *
 * Body (template):
 *   { phone_id, to, type: "template", template_name, language, components? }
 *
 * Requiere sesión activa del usuario con ese phone_id configurado.
 * Guarda el mensaje saliente en whatsapp_messages.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH = "https://graph.facebook.com/v21.0";

interface TextPayload {
    phone_id: string;
    to: string;
    type: "text";
    message: string;
}

interface TemplatePayload {
    phone_id: string;
    to: string;
    type: "template";
    template_name: string;
    language?: string;
    components?: unknown[];
}

type SendPayload = TextPayload | TemplatePayload;

export async function POST(req: NextRequest) {
    try {
        // Verify session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const payload: SendPayload = await req.json();
        const { phone_id, to, type } = payload;

        // Basic validation
        if (!phone_id || !to || !type) {
            return NextResponse.json(
                { error: "Faltan campos requeridos: phone_id, to, type" },
                { status: 400 }
            );
        }

        const cleanTo = to.replace(/\D/g, "");
        if (cleanTo.length < 7) {
            return NextResponse.json({ error: "Número de destino inválido" }, { status: 400 });
        }

        // Get access token (verify ownership)
        const admin = createAdminClient();
        const { data: conn } = await admin
            .from("user_whatsapps")
            .select("access_token, clinic_id, status")
            .eq("user_id", user.id)
            .eq("phone_id", phone_id)
            .single();

        if (!conn) {
            return NextResponse.json(
                { error: "WhatsApp no configurado para este usuario" },
                { status: 404 }
            );
        }

        if (conn.status !== "active") {
            return NextResponse.json(
                { error: "La conexión de WhatsApp está inactiva" },
                { status: 403 }
            );
        }

        // Build Meta API payload
        const metaPayload: Record<string, unknown> = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
        };

        if (type === "text") {
            metaPayload.type = "text";
            metaPayload.text = {
                body: (payload as TextPayload).message,
                preview_url: false,
            };
        } else if (type === "template") {
            const tp = payload as TemplatePayload;
            metaPayload.type = "template";
            metaPayload.template = {
                name: tp.template_name,
                language: { code: tp.language ?? "es_AR" },
                components: tp.components ?? [],
            };
        } else {
            return NextResponse.json({ error: `Tipo '${type}' no soportado` }, { status: 400 });
        }

        console.log("[WA Send] Sending to", cleanTo, "via phone", phone_id, "type:", type);

        // Call Meta Graph API
        const metaRes = await fetch(`${GRAPH}/${phone_id}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${conn.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(metaPayload),
        });

        const metaData = await metaRes.json();

        if (metaData.error) {
            console.error("[WA Send] Meta error:", metaData.error);

            // Rate limit
            if (metaData.error.code === 131056 || metaData.error.type === "OAuthException") {
                return NextResponse.json(
                    { error: "Límite de tasa alcanzado. Esperá unos minutos." },
                    { status: 429 }
                );
            }

            return NextResponse.json(
                { error: metaData.error.message ?? "Error de la API de Meta" },
                { status: 400 }
            );
        }

        const wamid: string = metaData.messages?.[0]?.id ?? null;
        console.log("[WA Send] Sent:", wamid, "→", cleanTo);

        // Save outbound message
        await admin.from("whatsapp_messages").insert({
            clinic_id: conn.clinic_id ?? null,
            phone_id,
            wamid,
            direction: "outbound",
            from_number: phone_id,
            to_number: cleanTo,
            type,
            body: type === "text" ? (payload as TextPayload).message : null,
            status: "sent",
            timestamp: new Date().toISOString(),
            raw_payload: metaData,
        });

        return NextResponse.json({ success: true, message_id: wamid });
    } catch (err: any) {
        console.error("[WA Send] Unexpected error:", err.message);
        return NextResponse.json(
            { error: err.message ?? "Error interno del servidor" },
            { status: 500 }
        );
    }
}
