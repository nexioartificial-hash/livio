"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"),
    { auth: { autoRefreshToken: false, persistSession: false } }
);

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

export async function getNotifications(userId: string): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
    if (!userId) return { success: false, error: "userId requerido" };
    try {
        const { data, error } = await supabaseAdmin
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30);
        if (error) throw error;
        return { success: true, data: data as Notification[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function markAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) return { success: false, error: "id requerido" };
    try {
        const { error } = await supabaseAdmin
            .from("notifications")
            .update({ unread: false })
            .eq("id", id);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: "userId requerido" };
    try {
        const { error } = await supabaseAdmin
            .from("notifications")
            .update({ unread: false })
            .eq("user_id", userId)
            .eq("unread", true);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createNotification(data: Omit<Notification, "id" | "created_at" | "unread">): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabaseAdmin.from("notifications").insert([{ ...data, unread: true }]);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function seedNotifications(userId: string, clinicId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || !clinicId) return { success: false, error: "userId y clinicId requeridos" };

    const now = new Date();
    const seeds = [
        {
            user_id: userId,
            clinic_id: clinicId,
            type: "agenda" as const,
            title: "Turno próximo en 1 hora",
            body: "Juan García — 10:00hs — Box 2",
            link: "/agenda",
        },
        {
            user_id: userId,
            clinic_id: clinicId,
            type: "stock" as const,
            title: "Stock bajo detectado",
            body: "Agujas Cortas 30G: solo 4 unidades (mín. 10)",
            link: "/config?tab=inventario",
        },
        {
            user_id: userId,
            clinic_id: clinicId,
            type: "lead" as const,
            title: "Nuevo paciente registrado",
            body: "María López se registró y solicitó turno",
            link: "/pacientes",
        },
        {
            user_id: userId,
            clinic_id: clinicId,
            type: "alerta" as const,
            title: "Insumo próximo a vencer",
            body: "Lidocaína 2% vence en 5 días",
            link: "/config?tab=inventario",
        },
        {
            user_id: userId,
            clinic_id: clinicId,
            type: "info" as const,
            title: "Configuración actualizada",
            body: "Los datos de tu clínica fueron actualizados exitosamente",
        },
    ];

    try {
        const { error } = await supabaseAdmin.from("notifications").insert(seeds);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
