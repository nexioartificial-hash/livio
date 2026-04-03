"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { sendSupportNotification } from "@/lib/email/send";

// ─── Admin client (server-side only, bypasea RLS) ────────────────
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

// ─── Schemas Zod ─────────────────────────────────────────────────

const TICKET_CATEGORIES = [
    "agenda",
    "whatsapp",
    "pagos",
    "calendar",
    "cuenta",
    "otro",
] as const;

const TICKET_PRIORITIES = ["normal", "urgente"] as const;

const TICKET_STATUSES = ["abierto", "en_progreso", "resuelto", "cerrado"] as const;

const createTicketSchema = z.object({
    subject: z.string().min(3, "El asunto debe tener al menos 3 caracteres").max(200, "El asunto no puede superar 200 caracteres"),
    category: z.enum(TICKET_CATEGORIES, { error: "Categoría inválida" }),
    priority: z.enum(TICKET_PRIORITIES, { error: "Prioridad inválida" }).default("normal"),
    body: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(5000, "El mensaje no puede superar 5000 caracteres"),
    source_module: z.string().optional(),
});

const sendMessageSchema = z.object({
    ticket_id: z.string().uuid("ID de ticket inválido"),
    body: z.string().min(1, "El mensaje no puede estar vacío").max(5000, "El mensaje no puede superar 5000 caracteres"),
});

// ─── Tipos internos ───────────────────────────────────────────────

interface CallerWithClinic {
    id: string;
    full_name: string;
    email: string;
    clinic_id: string;
    clinic_name: string;
    role: string;
}

// ─── Helper privado ───────────────────────────────────────────────

/** Retorna el perfil completo del caller con datos de clínica. Throws si no autenticado. */
async function getCallerWithClinic(): Promise<CallerWithClinic> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: prof } = await supabaseAdmin
        .from("professional")
        .select("id, full_name, clinic_id, role")
        .eq("id", user.id)
        .single();

    if (!prof) throw new Error("Perfil no encontrado");
    if (!prof.clinic_id) throw new Error("El profesional no tiene clínica asignada");

    const { data: clinic } = await supabaseAdmin
        .from("clinic")
        .select("name")
        .eq("id", prof.clinic_id)
        .single();

    return {
        id: user.id,
        full_name: prof.full_name ?? "Usuario",
        email: user.email ?? "",
        clinic_id: prof.clinic_id,
        clinic_name: clinic?.name ?? "Clínica",
        role: prof.role ?? "profesional",
    };
}

// ─── Actions ─────────────────────────────────────────────────────

/** Crea un nuevo ticket de soporte con su primer mensaje. */
export async function createTicket(formData: {
    subject: string;
    category: string;
    priority?: string;
    body: string;
    source_module?: string;
    attachment_url?: string;
}): Promise<{ success?: boolean; ticketId?: string; error?: string }> {
    try {
        const parsed = createTicketSchema.safeParse(formData);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
            return { error: firstError };
        }

        const caller = await getCallerWithClinic();
        const supabase = await createServerClient();

        // Inserta el ticket (RLS aplica automáticamente)
        const { data: ticket, error: ticketError } = await supabase
            .from("support_tickets")
            .insert({
                clinic_id: caller.clinic_id,
                created_by: caller.id,
                subject: parsed.data.subject,
                category: parsed.data.category,
                priority: parsed.data.priority,
                status: "abierto",
                source_module: parsed.data.source_module ?? null,
            })
            .select("id")
            .single();

        if (ticketError || !ticket) {
            console.error("[soporte] Error al crear ticket:", ticketError);
            throw new Error("Error al crear el ticket");
        }

        // Inserta el primer mensaje
        const { error: messageError } = await supabase
            .from("ticket_messages")
            .insert({
                ticket_id: ticket.id,
                sender_type: "user",
                sender_id: caller.id,
                body: parsed.data.body,
                attachment_url: formData.attachment_url ?? null,
            });

        if (messageError) {
            console.error("[soporte] Error al insertar mensaje inicial:", messageError);
            throw new Error("Error al guardar el mensaje del ticket");
        }

        // Notificación por email (best-effort, no bloquea el flujo)
        sendSupportNotification(
            ticket.id,
            parsed.data.subject,
            parsed.data.category,
            parsed.data.priority,
            parsed.data.body,
            caller.clinic_name,
            caller.full_name,
            caller.email,
        ).catch((err: unknown) => {
            console.error("[soporte] Error al enviar notificación de ticket:", err);
        });

        revalidatePath("/soporte");
        return { success: true, ticketId: ticket.id };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        if (message === "Unauthorized") return { error: "No autorizado" };
        console.error("[soporte] createTicket error:", error);
        return { error: message };
    }
}

/** Envía un nuevo mensaje en un ticket existente. */
export async function sendMessage(formData: {
    ticket_id: string;
    body: string;
    attachment_url?: string;
}): Promise<{ success?: boolean; error?: string }> {
    try {
        const parsed = sendMessageSchema.safeParse(formData);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
            return { error: firstError };
        }

        const caller = await getCallerWithClinic();
        const supabase = await createServerClient();

        // Inserta el mensaje (RLS aplica automáticamente)
        const { error: messageError } = await supabase
            .from("ticket_messages")
            .insert({
                ticket_id: parsed.data.ticket_id,
                sender_type: "user",
                sender_id: caller.id,
                body: parsed.data.body,
                attachment_url: formData.attachment_url ?? null,
            });

        if (messageError) {
            console.error("[soporte] Error al enviar mensaje:", messageError);
            throw new Error("Error al enviar el mensaje");
        }

        // Actualiza updated_at del ticket
        const { error: updateError } = await supabase
            .from("support_tickets")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", parsed.data.ticket_id);

        if (updateError) {
            console.error("[soporte] Error al actualizar updated_at del ticket:", updateError);
        }

        // Obtiene datos del ticket para el email
        const { data: ticketData } = await supabase
            .from("support_tickets")
            .select("subject, category, priority")
            .eq("id", parsed.data.ticket_id)
            .single();

        if (ticketData) {
            sendSupportNotification(
                parsed.data.ticket_id,
                ticketData.subject,
                ticketData.category,
                ticketData.priority,
                parsed.data.body,
                caller.clinic_name,
                caller.full_name,
                caller.email,
            ).catch((err: unknown) => {
                console.error("[soporte] Error al enviar notificación de mensaje:", err);
            });
        }

        revalidatePath("/soporte");
        revalidatePath(`/soporte/${parsed.data.ticket_id}`);
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        if (message === "Unauthorized") return { error: "No autorizado" };
        console.error("[soporte] sendMessage error:", error);
        return { error: message };
    }
}

/** Actualiza el estado de un ticket. Si pasa a 'resuelto', registra resolved_at. */
export async function updateTicketStatus(
    ticketId: string,
    status: string,
): Promise<{ success?: boolean; error?: string }> {
    try {
        if (!TICKET_STATUSES.includes(status as typeof TICKET_STATUSES[number])) {
            return { error: "Estado inválido" };
        }

        const supabase = await createServerClient();

        const updatePayload: Record<string, string> = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (status === "resuelto") {
            updatePayload.resolved_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from("support_tickets")
            .update(updatePayload)
            .eq("id", ticketId);

        if (error) {
            console.error("[soporte] Error al actualizar estado:", error);
            throw new Error("Error al actualizar el estado del ticket");
        }

        revalidatePath("/soporte");
        revalidatePath(`/soporte/${ticketId}`);
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        if (message === "Unauthorized") return { error: "No autorizado" };
        console.error("[soporte] updateTicketStatus error:", error);
        return { error: message };
    }
}

/** Lista los tickets de la clínica del caller. RLS filtra automáticamente. */
export async function getTickets(filters?: {
    status?: string;
    category?: string;
}): Promise<{ success?: boolean; tickets?: unknown[]; error?: string }> {
    try {
        const supabase = await createServerClient();

        let query = supabase
            .from("support_tickets")
            .select(`
                *,
                created_by:professional!support_tickets_created_by_fkey(full_name, email)
            `)
            .order("created_at", { ascending: false });

        if (filters?.status && filters.status !== "todos") {
            query = query.eq("status", filters.status);
        }

        if (filters?.category && filters.category !== "todos") {
            query = query.eq("category", filters.category);
        }

        const { data: tickets, error } = await query;

        if (error) {
            console.error("[soporte] Error al obtener tickets:", error);
            throw new Error("Error al obtener los tickets");
        }

        return { success: true, tickets: tickets ?? [] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        if (message === "Unauthorized") return { error: "No autorizado" };
        console.error("[soporte] getTickets error:", error);
        return { error: message };
    }
}

/** Obtiene un ticket con todos sus mensajes. RLS verifica acceso automáticamente. */
export async function getTicketMessages(ticketId: string): Promise<{
    success?: boolean;
    ticket?: unknown;
    messages?: unknown[];
    error?: string;
}> {
    try {
        const supabase = await createServerClient();

        // Obtiene el ticket con datos del creador
        const { data: ticket, error: ticketError } = await supabase
            .from("support_tickets")
            .select(`
                *,
                created_by:professional!support_tickets_created_by_fkey(full_name, email)
            `)
            .eq("id", ticketId)
            .single();

        if (ticketError || !ticket) {
            console.error("[soporte] Ticket no encontrado:", ticketError);
            return { error: "Ticket no encontrado" };
        }

        // Obtiene mensajes con datos del emisor ordenados por fecha ascendente
        const { data: messages, error: messagesError } = await supabase
            .from("ticket_messages")
            .select(`
                *,
                sender:professional!ticket_messages_sender_id_fkey(full_name)
            `)
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true });

        if (messagesError) {
            console.error("[soporte] Error al obtener mensajes:", messagesError);
            throw new Error("Error al obtener los mensajes del ticket");
        }

        return { success: true, ticket, messages: messages ?? [] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        if (message === "Unauthorized") return { error: "No autorizado" };
        console.error("[soporte] getTicketMessages error:", error);
        return { error: message };
    }
}
