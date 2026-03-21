import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/security/password-validator";
import { writeAuditLog } from "@/lib/security/audit-log";
import { headers } from "next/headers";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { newPassword } = await req.json();
        if (!newPassword || typeof newPassword !== "string") {
            return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
        }

        // Validate password strength
        const validation = validatePassword(newPassword, user.email);
        if (!validation.valid) {
            return NextResponse.json(
                { error: "Contraseña no cumple los requisitos", details: validation.errors },
                { status: 400 },
            );
        }

        // Update password via Supabase Auth
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Audit log
        const hdrs = await headers();
        const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        await writeAuditLog({
            userId: user.id,
            email: user.email || "",
            eventType: "password_changed",
            ip,
            userAgent: hdrs.get("user-agent") || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
