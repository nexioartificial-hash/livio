/**
 * GET /api/whatsapp/qr/[phone_id]
 * Genera el QR de coexistencia llamando a la Graph API de Meta.
 * Devuelve { qr_image_url, qr_code (SVG), deep_link_url }.
 *
 * Requiere sesión activa del usuario que tenga ese phone_id asociado.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ phone_id: string }> }
) {
    try {
        const { phone_id } = await params;

        // Verify user session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Get the access token for this phone (verify ownership)
        const admin = createAdminClient();
        const { data: conn, error: connError } = await admin
            .from("user_whatsapps")
            .select("access_token, phone_id")
            .eq("user_id", user.id)
            .eq("phone_id", phone_id)
            .single();

        if (connError || !conn) {
            return NextResponse.json({ error: "Número no encontrado" }, { status: 404 });
        }

        console.log("[WA QR] Generating QR for phone:", phone_id);

        // Call Meta API to generate QR
        const metaRes = await fetch(
            `${GRAPH}/${phone_id}/generate_qr_code` +
            `?generate_qr_image=SVG&messaging_product=whatsapp`,
            {
                headers: { Authorization: `Bearer ${conn.access_token}` },
                cache: "no-store",
            }
        );

        const metaData = await metaRes.json();

        if (metaData.error) {
            console.error("[WA QR] Meta error:", metaData.error);
            return NextResponse.json(
                { error: metaData.error.message ?? "Error generando QR" },
                { status: 400 }
            );
        }

        console.log("[WA QR] QR generated:", metaData.id ?? "ok");

        return NextResponse.json({
            qr_image_url: metaData.qr_image_url ?? null,
            qr_code: metaData.code ?? null,         // SVG or code string
            deep_link_url: metaData.deep_link_url ?? null,
            prefilled_message: metaData.prefilled_message ?? null,
        });
    } catch (err: any) {
        console.error("[WA QR] Unexpected error:", err.message);
        return NextResponse.json({ error: err.message ?? "Error interno" }, { status: 500 });
    }
}
