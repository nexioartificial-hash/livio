import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { headers } from "next/headers";

/**
 * DELETE /api/auth/sessions
 * Revokes all sessions for the authenticated user (sign out everywhere).
 */
export async function DELETE() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Sign out globally (all sessions)
        await supabase.auth.signOut({ scope: "global" });

        // Audit log
        const hdrs = await headers();
        const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        await writeAuditLog({
            userId: user.id,
            email: user.email || "",
            eventType: "logout",
            ip,
            metadata: { scope: "global" },
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
