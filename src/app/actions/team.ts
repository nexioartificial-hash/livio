"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// Admin client (server-side only)
const supabaseAdmin = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
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
        let clinicName = "Tu Clínica";
        let inviterName = "Livio";

        if (inviterId) {
            const { data: inviterProfile } = await supabaseAdmin
                .from("professional")
                .select("clinic_id, full_name")
                .eq("id", inviterId)
                .maybeSingle();

            clinicId = inviterProfile?.clinic_id || null;
            inviterName = inviterProfile?.full_name || "Livio";

            if (clinicId) {
                const { data: clinicData } = await supabaseAdmin
                    .from("clinic")
                    .select("name")
                    .eq("id", clinicId)
                    .maybeSingle();
                
                if (clinicData?.name) clinicName = clinicData.name;
            }
        }

        // Call the Resend API route
        const headersList = await headers();
        const host = headersList.get("host");
        const protocol = host?.includes("localhost") ? "http" : "https";
        let origin = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
        if (origin.includes('vercel.app') || host?.includes('vercel.app')) {
            origin = 'https://liviodental.com';
        }
        
        console.log(`📡 [Team] Enviando invitación via: ${origin}/api/send-invite`);
        
        const res = await fetch(`${origin}/api/send-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                role,
                clinicId,
                clinicName,
                inviterName,
                inviterId,
                invitedName: fullName
            }),
        });

        const result = await res.json();
        console.log(`📩 [Team] Respuesta de API de invitación:`, result);

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

        const clinicId = profile?.clinic_id;

        const query = supabaseAdmin
            .from("invites")
            .select("*")
            .order("created_at", { ascending: false });

        if (clinicId) {
            query.eq("clinic_id", clinicId);
        } else {
            query.eq("inviter_id", userId); // Fallback for new clinics
        }

        const { data: invites, error } = await query;
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

// ─── Get Team Members (Filtered by Clinic) ────────────────────────
export async function getTeamMembers(clinicId?: string | null, ownerId?: string | null) {
    try {
        if (!clinicId && !ownerId) {
            return { success: true, data: [] };
        }

        // 1. Get professionals for this clinic
        const query = supabaseAdmin
            .from("professional")
            .select("*")

        if (clinicId) {
            query.eq("clinic_id", clinicId);
        } else {
            query.eq("id", ownerId); // Fallback for owner-only view if clinic_id not linked
        }

        const { data: profiles, error: profileError } = await query;
        if (profileError) throw profileError;

        // 2. Get pending invites for this clinic
        const inviteQuery = supabaseAdmin
            .from("invites")
            .select("*")
            .eq("status", "pending")

        if (clinicId) {
            inviteQuery.eq("clinic_id", clinicId);
        } else if (ownerId) {
            inviteQuery.eq("inviter_id", ownerId);
        }

        const { data: invites, error: inviteError } = await inviteQuery;
        if (inviteError) throw inviteError;

        // 3. Fetch real emails from Auth Admin for all these profiles
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        const emailMap: Record<string, string> = {};
        if (!authError && authUsers?.users) {
            authUsers.users.forEach(u => {
                if (u.email) emailMap[u.id] = u.email;
            });
        }

        // 4. Map profiles to team members
        const teamProfiles = (profiles || []).map(p => ({
            id: p.id,
            email: emailMap[p.id] || p.google_user_email || "Usuario Livio", 
            full_name: p.full_name || "Profesional",
            role: p.role,
            status: "activo",
            created_at: p.created_at
        }));

        // 5. Map invites to team members
        const teamInvites = (invites || []).map(i => ({
            id: i.id,
            email: i.email,
            full_name: i.invited_name || i.email.split('@')[0], // Use invited_name if available
            role: i.role,
            status: "pendiente",
            created_at: i.created_at
        }));

        // Combined and sorted
        const mergedTeam = [...teamProfiles, ...teamInvites];

        // Final cleanup for auth data (optional but safer: only use database as source of truth for team list)
        // We can't easily list emails from Auth for non-active users without admin privileges,
        // but we can try to fetch the current user's email if they are in the list.

        const sortedTeam = mergedTeam.sort((a, b) => {
            if (a.role === 'superadmin' && b.role !== 'superadmin') return -1;
            if (a.role !== 'superadmin' && b.role === 'superadmin') return 1;
            return (a.full_name || "").localeCompare(b.full_name || "");
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
export async function deleteMember(id: string) {
    try {
        // 1. Try to see if it's a pending invite first
        const { data: invite } = await supabaseAdmin
            .from("invites")
            .select("id, email")
            .eq("id", id)
            .maybeSingle();

        if (invite) {
            // It's a pending invite, just delete it
            const { error: deleteInviteError } = await supabaseAdmin
                .from("invites")
                .delete()
                .eq("id", id);
            
            if (deleteInviteError) throw deleteInviteError;
            
            revalidatePath("/config");
            return { success: true };
        }

        // 2. If not an invite, it must be a professional profile
        const { data: profile } = await supabaseAdmin
            .from("professional")
            .select("id, clinic_id, google_user_email")
            .eq("id", id)
            .maybeSingle();

        if (profile) {
            // Fetch real email from Auth to ensure we wipe the right invites
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
            const userEmail = authUser?.user?.email || profile.google_user_email;

            // Delete associated invites first to avoid re-invite issues later
            if (userEmail) {
                await supabaseAdmin
                    .from("invites")
                    .delete()
                    .eq("email", userEmail);
            }

            // Delete professional profile
            const { error: deleteProfileError } = await supabaseAdmin
                .from("professional")
                .delete()
                .eq("id", id);
            
            if (deleteProfileError) throw deleteProfileError;

            // Delete from Auth if possible (this might fail if the user doesn't exist anymore or other issues)
            try {
                await supabaseAdmin.auth.admin.deleteUser(id);
            } catch (authError) {
                console.warn("Auth deletion failed, maybe user was already gone:", authError);
            }

            revalidatePath("/config");
            return { success: true };
        }

        return { error: "No se encontró el miembro a eliminar." };
    } catch (error: any) {
        console.error("Delete member error:", error);
        return { error: error.message };
    }
}

// ─── Update Member Professional Data ─────────────────────────────
export async function updateMemberProfessional(userId: string, data: any) {
    try {
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
        console.error("Update member error:", error);
        return { error: error.message };
    }
}
