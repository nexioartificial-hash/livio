import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile + clinic info.
 * Used by clients that need to verify auth state server-side.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Get professional profile
        const admin = createAdminClient();
        const { data: profile } = await admin
            .from("professional")
            .select("full_name, role, clinic_id, is_onboarded, license, specialty")
            .eq("id", user.id)
            .maybeSingle();

        // Get clinic info if available
        let clinic = null;
        if (profile?.clinic_id) {
            const { data: clinicData } = await admin
                .from("clinic")
                .select("id, name, cuit, plan, trial_end")
                .eq("id", profile.clinic_id)
                .maybeSingle();
            clinic = clinicData;
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            emailVerified: !!user.email_confirmed_at,
            role: profile?.role || "profesional",
            fullName: profile?.full_name || user.user_metadata?.full_name || null,
            clinicId: profile?.clinic_id || null,
            isOnboarded: profile?.is_onboarded ?? false,
            clinic,
        });
    } catch {
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
