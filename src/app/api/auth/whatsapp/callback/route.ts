/**
 * POST /api/auth/whatsapp/callback
 *   Recibe { code } del client (después del popup de FB SDK).
 *   1. Intercambia code → short-lived token → long-lived token.
 *   2. Lista los WABAs compartidos por el usuario.
 *   3. Obtiene el phone_number_id, display_number y verified_name.
 *   4. Guarda / actualiza en user_whatsapps.
 *
 * GET /api/auth/whatsapp/callback
 *   Fallback para OAuth redirect. Redirige a la página que procesa el code.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_ID = process.env.META_APP_ID!;
const APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = process.env.META_REDIRECT_URI!;
const GRAPH = "https://graph.facebook.com/v21.0";

// ── Token helpers ────────────────────────────────────────────────────────────

async function exchangeCode(code: string): Promise<string> {
    const url =
        `${GRAPH}/oauth/access_token` +
        `?client_id=${APP_ID}` +
        `&client_secret=${APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&code=${code}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
        console.error("[WA callback] Token exchange error:", data.error);
        throw new Error(data.error.message || "Error intercambiando el código de Meta");
    }
    return data.access_token;
}

async function toLongLivedToken(shortToken: string): Promise<string> {
    const url =
        `${GRAPH}/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${APP_ID}` +
        `&client_secret=${APP_SECRET}` +
        `&fb_exchange_token=${shortToken}`;

    const res = await fetch(url);
    const data = await res.json();
    // If it fails, fall back to the short-lived token rather than crashing
    return data.access_token ?? shortToken;
}

// ── WABA + Phone discovery ───────────────────────────────────────────────────

interface WABAInfo {
    waba_id: string;
    phone_id: string;
    display_number: string;
    verified_name: string;
}

async function discoverWABA(accessToken: string): Promise<WABAInfo> {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. List businesses owned/associated with the user
    const bizRes = await fetch(
        `${GRAPH}/me/businesses?fields=id,name&limit=10`,
        { headers }
    );
    const bizData = await bizRes.json();

    if (bizData.error) throw new Error(`Error obteniendo businesses: ${bizData.error.message}`);
    if (!bizData.data?.length) throw new Error("No se encontró ninguna cuenta Business de Meta.");

    // 2. For each business, look for WABAs
    for (const biz of bizData.data as { id: string; name: string }[]) {
        const wabaRes = await fetch(
            `${GRAPH}/${biz.id}/owned_whatsapp_business_accounts?fields=id,name&limit=5`,
            { headers }
        );
        const wabaData = await wabaRes.json();

        if (wabaData.error || !wabaData.data?.length) continue;

        // 3. For each WABA, look for phone numbers
        for (const waba of wabaData.data as { id: string }[]) {
            const phonesRes = await fetch(
                `${GRAPH}/${waba.id}/phone_numbers` +
                `?fields=id,display_phone_number,verified_name,quality_rating,status&limit=5`,
                { headers }
            );
            const phonesData = await phonesRes.json();

            if (phonesData.error || !phonesData.data?.length) continue;

            // Use the first active phone number found
            const phone = (phonesData.data as any[]).find(p => p.status !== "DELETED") ?? phonesData.data[0];

            console.log("[WA callback] Found phone:", phone.display_phone_number, "WABA:", waba.id);

            return {
                waba_id: waba.id,
                phone_id: phone.id,
                display_number: phone.display_phone_number,
                verified_name: phone.verified_name ?? "",
            };
        }
    }

    throw new Error("No se encontró ningún número de WhatsApp Business vinculado a tu cuenta Meta.");
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        // Verify authenticated user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = await req.json();
        const code: string = body.code;

        if (!code?.trim()) {
            return NextResponse.json({ error: "El campo 'code' es requerido" }, { status: 400 });
        }

        console.log("[WA callback] Processing for user:", user.id);

        // Exchange code for tokens
        const shortToken = await exchangeCode(code);
        const accessToken = await toLongLivedToken(shortToken);

        // Discover WABA and phone
        const wabaInfo = await discoverWABA(accessToken);

        // Persist in DB (upsert by user_id)
        const admin = createAdminClient();

        // Try to get clinic_id from existing professional record
        const { data: prof } = await admin
            .from("professional")
            .select("clinic_id")
            .eq("user_id", user.id)
            .single();

        const { error: dbError } = await admin
            .from("user_whatsapps")
            .upsert(
                {
                    user_id: user.id,
                    clinic_id: prof?.clinic_id ?? null,
                    waba_id: wabaInfo.waba_id,
                    phone_id: wabaInfo.phone_id,
                    display_number: wabaInfo.display_number,
                    verified_name: wabaInfo.verified_name,
                    access_token: accessToken,
                    status: "active",
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            );

        if (dbError) {
            console.error("[WA callback] DB error:", dbError);
            throw new Error("Error guardando la configuración de WhatsApp");
        }

        console.log("[WA callback] Saved connection for user:", user.id, "→", wabaInfo.display_number);

        return NextResponse.json({
            success: true,
            phone_id: wabaInfo.phone_id,
            display_number: wabaInfo.display_number,
            verified_name: wabaInfo.verified_name,
        });
    } catch (err: any) {
        console.error("[WA callback] Error:", err.message);
        return NextResponse.json(
            { error: err.message ?? "Error interno del servidor" },
            { status: 500 }
        );
    }
}

// ── GET handler (redirect-based OAuth fallback) ───────────────────────────────

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (error) {
        console.error("[WA callback] OAuth redirect error:", error, errorDesc);
        const params = new URLSearchParams({ error: errorDesc ?? error });
        return NextResponse.redirect(new URL(`/whatsapp-connect?${params}`, req.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/whatsapp-connect?error=no_code", req.url));
    }

    // Pass code to a client component that can call the POST endpoint
    const params = new URLSearchParams({ code });
    return NextResponse.redirect(new URL(`/whatsapp-connect?${params}`, req.url));
}
