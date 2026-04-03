"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getWhatsAppConnection() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();

    // Get clinic_id from professional
    const { data: prof } = await admin
        .from("professional")
        .select("clinic_id")
        .eq("id", user.id)
        .maybeSingle();

    if (!prof?.clinic_id) return null;

    // Check for active WhatsApp connection
    const { data: conn } = await admin
        .from("user_whatsapps")
        .select("phone_id, display_number, verified_name")
        .eq("clinic_id", prof.clinic_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

    return conn ? { phoneId: conn.phone_id, clinicId: prof.clinic_id, displayNumber: conn.display_number, verifiedName: conn.verified_name } : { phoneId: null, clinicId: prof.clinic_id, displayNumber: null, verifiedName: null };
}

export async function getConversations(clinicId: string) {
    // Verificar que el caller pertenece a esta clínica
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const admin = createAdminClient();
    const { data: prof } = await admin
        .from("professional")
        .select("clinic_id")
        .eq("id", user.id)
        .maybeSingle();
    if (!prof || prof.clinic_id !== clinicId) return [];

    const { data: msgs, error } = await admin
        .from("whatsapp_messages")
        .select("from_number, to_number, direction, body, timestamp, status")
        .eq("clinic_id", clinicId)
        .order("timestamp", { ascending: false })
        .limit(500);

    if (error) {
        console.error("[WA] Error fetching conversations:", error.message);
        return [];
    }

    // Group by contact phone number
    const convMap = new Map<string, { phone: string; lastMessage: string; lastTimestamp: string; unread: number }>();
    for (const m of msgs || []) {
        const phone = m.direction === "inbound" ? m.from_number : m.to_number;
        if (!phone) continue;

        if (!convMap.has(phone)) {
            convMap.set(phone, {
                phone,
                lastMessage: m.body || "",
                lastTimestamp: m.timestamp,
                unread: 0,
            });
        }

        if (m.direction === "inbound" && m.status === "received") {
            convMap.get(phone)!.unread++;
        }
    }

    // Match phone numbers to patient names
    const { data: patients } = await admin
        .from("patient")
        .select("full_name, phone")
        .eq("clinic_id", clinicId);

    const phoneToName = new Map<string, string>();
    for (const p of patients || []) {
        const clean = (p.phone || "").replace(/\D/g, "");
        if (clean) phoneToName.set(clean, p.full_name);
    }

    return Array.from(convMap.values())
        .map((c) => ({ ...c, patientName: phoneToName.get(c.phone) || null }))
        .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
}

export async function getMessages(clinicId: string, phone: string) {
    // Verificar que el caller pertenece a esta clínica
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const admin = createAdminClient();
    const { data: prof } = await admin
        .from("professional")
        .select("clinic_id")
        .eq("id", user.id)
        .maybeSingle();
    if (!prof || prof.clinic_id !== clinicId) return [];

    const { data, error } = await admin
        .from("whatsapp_messages")
        .select("id, clinic_id, phone_id, wamid, direction, from_number, to_number, type, body, status, timestamp, created_at")
        .eq("clinic_id", clinicId)
        .or(`from_number.eq.${phone},to_number.eq.${phone}`)
        .order("timestamp", { ascending: true });

    if (error) {
        console.error("[WA] Error fetching messages:", error.message);
        return [];
    }

    return data || [];
}
