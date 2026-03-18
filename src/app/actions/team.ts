"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// Admin client (server-side only)
const supabaseAdmin = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

/** Returns the caller's profile with clinic_id and role. Throws if not authenticated. */
async function getCallerProfile(): Promise<{ id: string; clinic_id: string | null; role: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: prof } = await supabaseAdmin
        .from("professional")
        .select("clinic_id, role")
        .eq("id", user.id)
        .single();

    return { id: user.id, clinic_id: prof?.clinic_id ?? null, role: prof?.role ?? "profesional" };
}

/** Verifies the caller is a superadmin. Throws if not. */
async function assertSuperadmin(): Promise<{ id: string; clinic_id: string | null }> {
    const caller = await getCallerProfile();
    if (caller.role !== "superadmin") throw new Error("Forbidden: superadmin required");
    return caller;
}

// ─── Invite Team Member (via Resend API) ─────────────────────────
export async function inviteTeamMember(
    email: string,
    fullName: string,
    role: string,
    inviterId?: string
) {
    try {
        // Verify the caller is the inviter (prevent impersonation)
        const caller = await getCallerProfile();
        if (inviterId && inviterId !== caller.id) throw new Error("Forbidden");

        // Get inviter's clinic_id & name
        let clinicId: string | null = caller.clinic_id;
        let clinicName = "Tu Clínica";
        const inviterName = (await supabaseAdmin
            .from("professional")
            .select("full_name")
            .eq("id", caller.id)
            .single()).data?.full_name ?? "Livio";

        if (clinicId) {
            const { data: clinicData } = await supabaseAdmin
                .from("clinic")
                .select("name")
                .eq("id", clinicId)
                .maybeSingle();
            if (clinicData?.name) clinicName = clinicData.name;
        }

        // Call the Resend API route
        const headersList = await headers();
        const host = headersList.get("host");
        const protocol = host?.includes("localhost") ? "http" : "https";
        let origin = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
        if (origin.includes('vercel.app') || host?.includes('vercel.app')) {
            origin = 'https://liviodental.com';
        }

        const res = await fetch(`${origin}/api/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                role,
                clinicId,
                clinicName,
                inviterName,
                inviterId: caller.id,
                invitedName: fullName
            }),
        });

        const result = await res.json();

        if (!res.ok) {
            return { error: result.error || "Error al enviar invitación" };
        }

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message === "Forbidden") {
            return { error: error.message };
        }
        console.error("Invite error:", error);
        return { error: "Error al enviar invitación" };
    }
}

// ─── Get Invites for Clinic ──────────────────────────────────────
export async function getClinicInvites() {
    try {
        const caller = await getCallerProfile();
        const clinicId = caller.clinic_id;

        const query = supabaseAdmin
            .from("invites")
            .select("*")
            .order("created_at", { ascending: false });

        if (clinicId) {
            query.eq("clinic_id", clinicId);
        } else {
            query.eq("inviter_id", caller.id);
        }

        const { data: invites, error } = await query;
        if (error) throw error;

        return { success: true, data: invites || [] };
    } catch (error: any) {
        if (error.message === "Unauthorized") return { error: error.message };
        console.error("Get invites error:", error);
        return { error: "Error al obtener invitaciones" };
    }
}

// ─── Resend Invite ───────────────────────────────────────────────
export async function resendInvite(inviteId: string) {
    try {
        const caller = await getCallerProfile();

        const { data: invite, error: fetchError } = await supabaseAdmin
            .from("invites")
            .select("*")
            .eq("id", inviteId)
            .single();

        if (fetchError || !invite) {
            return { error: "Invitación no encontrada." };
        }

        // Verify the invite belongs to the caller's clinic
        if (invite.clinic_id && invite.clinic_id !== caller.clinic_id) {
            return { error: "Forbidden" };
        }

        if (invite.status !== "pending") {
            return { error: "Solo se pueden reenviar invitaciones pendientes." };
        }

        let origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        if (origin.includes('vercel.app')) {
            origin = 'https://liviodental.com';
        }
        const res = await fetch(`${origin}/api/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: invite.email,
                role: invite.role,
                clinicId: invite.clinic_id,
                inviterName: invite.inviter_name,
                inviterId: invite.inviter_id,
            }),
        });

        if (!res.ok) {
            await supabaseAdmin
                .from("invites")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", inviteId);
        }

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized") return { error: error.message };
        console.error("Resend invite error:", error);
        return { error: "Error al reenviar invitación" };
    }
}

// ─── Cancel Invite ───────────────────────────────────────────────
export async function cancelInvite(inviteId: string) {
    try {
        const caller = await getCallerProfile();

        // Verify the invite belongs to the caller's clinic before cancelling
        const { data: invite } = await supabaseAdmin
            .from("invites")
            .select("clinic_id")
            .eq("id", inviteId)
            .single();

        if (invite && invite.clinic_id && invite.clinic_id !== caller.clinic_id) {
            return { error: "Forbidden" };
        }

        const { error } = await supabaseAdmin
            .from("invites")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", inviteId)
            .eq("status", "pending");

        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized") return { error: error.message };
        console.error("Cancel invite error:", error);
        return { error: "Error al cancelar invitación" };
    }
}

// ─── Get Team Members (Filtered by Clinic) ────────────────────────
export async function getTeamMembers(clinicId?: string | null, ownerId?: string | null) {
    try {
        const caller = await getCallerProfile();

        // Enforce that the caller can only view their own clinic's team
        const effectiveClinicId = caller.clinic_id;
        if (!effectiveClinicId && !ownerId) {
            return { success: true, data: [] };
        }
        // If a clinicId was passed but doesn't match the caller's, reject
        if (clinicId && effectiveClinicId && clinicId !== effectiveClinicId) {
            return { error: "Forbidden" };
        }

        const query = supabaseAdmin.from("professional").select("*");

        if (effectiveClinicId) {
            query.eq("clinic_id", effectiveClinicId);
        } else {
            query.eq("id", caller.id);
        }

        const { data: profiles, error: profileError } = await query;
        if (profileError) throw profileError;

        const inviteQuery = supabaseAdmin
            .from("invites")
            .select("*")
            .eq("status", "pending");

        if (effectiveClinicId) {
            inviteQuery.eq("clinic_id", effectiveClinicId);
        } else {
            inviteQuery.eq("inviter_id", caller.id);
        }

        const { data: invites, error: inviteError } = await inviteQuery;
        if (inviteError) throw inviteError;

        // Fetch real emails from Auth Admin
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        const emailMap: Record<string, string> = {};
        if (!authError && authUsers?.users) {
            authUsers.users.forEach(u => {
                if (u.email) emailMap[u.id] = u.email;
            });
        }

        const teamProfiles = (profiles || []).map(p => ({
            id: p.id,
            email: emailMap[p.id] || p.google_user_email || "Usuario Livio",
            full_name: p.full_name || "Profesional",
            role: p.role,
            status: "activo",
            created_at: p.created_at
        }));

        const teamInvites = (invites || []).map(i => ({
            id: i.id,
            email: i.email,
            full_name: i.invited_name || i.email.split('@')[0],
            role: i.role,
            status: "pendiente",
            created_at: i.created_at
        }));

        const sortedTeam = [...teamProfiles, ...teamInvites].sort((a, b) => {
            if (a.role === 'superadmin' && b.role !== 'superadmin') return -1;
            if (a.role !== 'superadmin' && b.role === 'superadmin') return 1;
            return (a.full_name || "").localeCompare(b.full_name || "");
        });

        return { success: true, data: sortedTeam };
    } catch (error: any) {
        if (error.message === "Unauthorized") return { error: error.message };
        console.error("Fetch team error:", error);
        return { error: "Error al obtener equipo" };
    }
}

// ─── Update Member Role ──────────────────────────────────────────
export async function updateMemberRole(userId: string, newRole: string) {
    const ALLOWED_ROLES = ["superadmin", "profesional", "recepcionista"];
    if (!ALLOWED_ROLES.includes(newRole)) {
        return { error: "Rol inválido" };
    }

    try {
        const caller = await assertSuperadmin();

        // Verify target user is in the same clinic
        const { data: targetProf } = await supabaseAdmin
            .from("professional")
            .select("clinic_id")
            .eq("id", userId)
            .single();

        if (!targetProf || targetProf.clinic_id !== caller.clinic_id) {
            return { error: "Forbidden" };
        }

        const { error } = await supabaseAdmin
            .from("professional")
            .update({ role: newRole })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message.startsWith("Forbidden")) {
            return { error: error.message };
        }
        return { error: "Error al actualizar rol" };
    }
}

// ─── Delete Member ───────────────────────────────────────────────
export async function deleteMember(id: string) {
    try {
        const caller = await assertSuperadmin();

        // 1. Try to see if it's a pending invite first
        const { data: invite } = await supabaseAdmin
            .from("invites")
            .select("id, email, clinic_id")
            .eq("id", id)
            .maybeSingle();

        if (invite) {
            // Verify invite belongs to caller's clinic
            if (invite.clinic_id && invite.clinic_id !== caller.clinic_id) {
                return { error: "Forbidden" };
            }
            const { error: deleteInviteError } = await supabaseAdmin
                .from("invites")
                .delete()
                .eq("id", id);
            if (deleteInviteError) throw deleteInviteError;
            revalidatePath("/config");
            return { success: true };
        }

        // 2. It must be a professional profile
        const { data: profile } = await supabaseAdmin
            .from("professional")
            .select("id, clinic_id, google_user_email")
            .eq("id", id)
            .maybeSingle();

        if (profile) {
            // Verify target is in the same clinic
            if (profile.clinic_id !== caller.clinic_id) {
                return { error: "Forbidden" };
            }

            // Prevent self-deletion
            if (id === caller.id) {
                return { error: "No podés eliminarte a vos mismo" };
            }

            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
            const userEmail = authUser?.user?.email || profile.google_user_email;

            if (userEmail) {
                await supabaseAdmin.from("invites").delete().eq("email", userEmail);
            }

            const { error: deleteProfileError } = await supabaseAdmin
                .from("professional")
                .delete()
                .eq("id", id);
            if (deleteProfileError) throw deleteProfileError;

            try {
                await supabaseAdmin.auth.admin.deleteUser(id);
            } catch (authError) {
                console.warn("Auth deletion failed:", authError);
            }

            revalidatePath("/config");
            return { success: true };
        }

        return { error: "No se encontró el miembro a eliminar." };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message.startsWith("Forbidden")) {
            return { error: error.message };
        }
        console.error("Delete member error:", error);
        return { error: "Error al eliminar miembro" };
    }
}

// ─── Update Member Professional Data ─────────────────────────────
export async function updateMemberProfessional(userId: string, data: {
    matricula_nacional?: string;
    specialty?: string;
    sucursales?: string[];
    horarios?: any;
    activo?: boolean;
}) {
    try {
        const caller = await getCallerProfile();

        // Allow superadmin to edit any member of their clinic, or allow self-edit
        if (userId !== caller.id) {
            if (caller.role !== "superadmin") throw new Error("Forbidden: superadmin required");

            // Verify target is in the same clinic
            const { data: targetProf } = await supabaseAdmin
                .from("professional")
                .select("clinic_id")
                .eq("id", userId)
                .single();

            if (!targetProf || targetProf.clinic_id !== caller.clinic_id) {
                throw new Error("Forbidden");
            }
        }

        const { error } = await supabaseAdmin
            .from("professional")
            .update({
                matricula_nacional: data.matricula_nacional,
                specialty: data.specialty,
                sucursales: data.sucursales,
                horarios: data.horarios,
                activo: data.activo,
            })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message.startsWith("Forbidden")) {
            return { error: error.message };
        }
        console.error("Update member error:", error);
        return { error: "Error al actualizar miembro" };
    }
}
