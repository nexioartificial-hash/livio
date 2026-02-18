"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Admin client (server-side only)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

// ─── Invite Team Member (via Resend API) ─────────────────────────
export async function inviteTeamMember(
    email: string,
    fullName: string,
    role: string,
    inviterId?: string
) {
    try {
        // Get inviter's clinic_id & name
        let clinicId: string | null = null;
        let inviterName = "Livio";

        if (inviterId) {
            const { data: inviterProfile } = await supabaseAdmin
                .from("professional")
                .select("clinic_id, full_name")
                .eq("id", inviterId)
                .maybeSingle();

            clinicId = inviterProfile?.clinic_id || null;
            inviterName = inviterProfile?.full_name || "Livio";
        }

        // Call the Resend API route
        const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const res = await fetch(`${origin}/api/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                role,
                clinicId,
                inviterName,
                inviterId,
            }),
        });

        const result = await res.json();

        if (!res.ok) {
            return { error: result.error || "Error al enviar invitación" };
        }

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Invite error:", error);
        return { error: error.message || "Error al enviar invitación" };
    }
}

// ─── Get Invites for Clinic ──────────────────────────────────────
export async function getClinicInvites(userId: string) {
    try {
        const { data: profile } = await supabaseAdmin
            .from("professional")
            .select("clinic_id")
            .eq("id", userId)
            .maybeSingle();

        if (!profile?.clinic_id) {
            return { success: true, data: [] };
        }

        const { data: invites, error } = await supabaseAdmin
            .from("invites")
            .select("*")
            .eq("clinic_id", profile.clinic_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return { success: true, data: invites || [] };
    } catch (error: any) {
        console.error("Get invites error:", error);
        return { error: error.message };
    }
}

// ─── Resend Invite ───────────────────────────────────────────────
export async function resendInvite(inviteId: string) {
    try {
        const { data: invite, error: fetchError } = await supabaseAdmin
            .from("invites")
            .select("*")
            .eq("id", inviteId)
            .single();

        if (fetchError || !invite) {
            return { error: "Invitación no encontrada." };
        }

        if (invite.status !== "pending") {
            return { error: "Solo se pueden reenviar invitaciones pendientes." };
        }

        // Call Resend API route to re-send email
        const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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

        // The API will handle duplicate check — for resend, first cancel old one
        if (!res.ok) {
            // If duplicate exists, just update the timestamp
            await supabaseAdmin
                .from("invites")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", inviteId);
        }

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Resend invite error:", error);
        return { error: error.message };
    }
}

// ─── Cancel Invite ───────────────────────────────────────────────
export async function cancelInvite(inviteId: string) {
    try {
        const { error } = await supabaseAdmin
            .from("invites")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", inviteId)
            .eq("status", "pending");

        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Cancel invite error:", error);
        return { error: error.message };
    }
}

// ─── Get Team Members ────────────────────────────────────────────
export async function getTeamMembers() {
    try {
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from("professional")
            .select("*");
        if (profileError) throw profileError;

        const mergedTeam = users.map(authUser => {
            const profile = profiles?.find(p => p.id === authUser.id);
            return {
                id: authUser.id,
                email: authUser.email,
                full_name: profile?.full_name || authUser.user_metadata?.full_name || "Invitado",
                role: profile?.role || authUser.user_metadata?.role || "profesional",
                status: authUser.last_sign_in_at ? "activo" : "pendiente",
                created_at: authUser.created_at
            };
        });

        const sortedTeam = mergedTeam.sort((a, b) => {
            if (a.role === 'superadmin' && b.role !== 'superadmin') return -1;
            if (a.role !== 'superadmin' && b.role === 'superadmin') return 1;
            return a.full_name.localeCompare(b.full_name);
        });

        return { success: true, data: sortedTeam };
    } catch (error: any) {
        console.error("Fetch team error:", error);
        return { error: error.message };
    }
}

// ─── Update Member Role ──────────────────────────────────────────
export async function updateMemberRole(userId: string, newRole: string) {
    try {
        const { error } = await supabaseAdmin
            .from("professional")
            .update({ role: newRole })
            .eq("id", userId);

        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

// ─── Delete Member ───────────────────────────────────────────────
export async function deleteMember(userId: string) {
    try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
