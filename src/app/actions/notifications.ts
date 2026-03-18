"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"),
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Returns the authenticated user's ID or throws. */
async function getCallerUserId(): Promise<string> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    return user.id;
}

export interface Notification {
    id: string;
    user_id: string;
    clinic_id?: string;
    type: "agenda" | "stock" | "lead" | "alerta" | "info";
    title: string;
    body?: string;
    link?: string;
    unread: boolean;
    created_at: string;
}

export async function getNotifications(): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
    try {
        const userId = await getCallerUserId();
        const { data, error } = await supabaseAdmin
            .from("notifications")
            .select("id, user_id, clinic_id, type, title, body, link, unread, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30);
        if (error) throw error;
        return { success: true, data: data as Notification[] };
    } catch (err: any) {
        if (err.message === "Unauthorized") return { success: false, error: err.message };
        return { success: false, error: "Error al obtener notificaciones" };
    }
}

export async function markAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) return { success: false, error: "id requerido" };
    try {
        const userId = await getCallerUserId();
        const { error } = await supabaseAdmin
            .from("notifications")
            .update({ unread: false })
            .eq("id", id)
            .eq("user_id", userId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        if (err.message === "Unauthorized") return { success: false, error: err.message };
        return { success: false, error: "Error al marcar notificación" };
    }
}

export async function markAllAsRead(): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getCallerUserId();
        const { error } = await supabaseAdmin
            .from("notifications")
            .update({ unread: false })
            .eq("user_id", userId)
            .eq("unread", true);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        if (err.message === "Unauthorized") return { success: false, error: err.message };
        return { success: false, error: "Error al marcar notificaciones" };
    }
}

export async function createNotification(data: Omit<Notification, "id" | "created_at" | "unread">): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getCallerUserId();
        // Force user_id to the authenticated caller
        const { error } = await supabaseAdmin.from("notifications").insert([{ ...data, user_id: userId, unread: true }]);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        if (err.message === "Unauthorized") return { success: false, error: err.message };
        return { success: false, error: "Error al crear notificación" };
    }
}

export async function seedNotifications(clinicId: string): Promise<{ success: boolean; error?: string }> {
    if (!clinicId) return { success: false, error: "clinicId requerido" };
    try {
        const userId = await getCallerUserId();

        const seeds = [
            { user_id: userId, clinic_id: clinicId, type: "agenda" as const, title: "Turno próximo en 1 hora", body: "Juan García — 10:00hs — Box 2", link: "/agenda" },
            { user_id: userId, clinic_id: clinicId, type: "stock" as const, title: "Stock bajo detectado", body: "Agujas Cortas 30G: solo 4 unidades (mín. 10)", link: "/config?tab=inventario" },
            { user_id: userId, clinic_id: clinicId, type: "lead" as const, title: "Nuevo paciente registrado", body: "María López se registró y solicitó turno", link: "/pacientes" },
            { user_id: userId, clinic_id: clinicId, type: "alerta" as const, title: "Insumo próximo a vencer", body: "Lidocaína 2% vence en 5 días", link: "/config?tab=inventario" },
            { user_id: userId, clinic_id: clinicId, type: "info" as const, title: "Configuración actualizada", body: "Los datos de tu clínica fueron actualizados exitosamente" },
        ];

        const { error } = await supabaseAdmin.from("notifications").insert(seeds);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        if (err.message === "Unauthorized") return { success: false, error: err.message };
        return { success: false, error: "Error al inicializar notificaciones" };
    }
}
