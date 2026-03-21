/**
 * Reusable server-side auth helpers for API routes and Server Components.
 * These provide the requireAuth, requireRole, and requireEmailVerified guards.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

export interface AuthenticatedUser {
    id: string;
    email: string;
    emailVerified: boolean;
    role: string;
    clinicId: string | null;
    fullName: string | null;
    supabaseUser: User;
}

/**
 * Verifies the request is authenticated. Returns the user or null.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) return null;

        const admin = createAdminClient();
        const { data: profile } = await admin
            .from("professional")
            .select("role, clinic_id, full_name")
            .eq("id", user.id)
            .maybeSingle();

        return {
            id: user.id,
            email: user.email || "",
            emailVerified: !!user.email_confirmed_at,
            role: profile?.role || "profesional",
            clinicId: profile?.clinic_id || null,
            fullName: profile?.full_name || user.user_metadata?.full_name || null,
            supabaseUser: user,
        };
    } catch {
        return null;
    }
}

/**
 * Guard: requires authentication. Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new AuthError("No autenticado", 401);
    }
    return user;
}

/**
 * Guard: requires specific role(s). Returns 403 if unauthorized.
 */
export async function requireRole(...allowedRoles: string[]): Promise<AuthenticatedUser> {
    const user = await requireAuth();
    if (!allowedRoles.includes(user.role)) {
        throw new AuthError("No tenés permisos para esta acción", 403);
    }
    return user;
}

/**
 * Guard: requires verified email. Returns 403 if not verified.
 */
export async function requireEmailVerified(): Promise<AuthenticatedUser> {
    const user = await requireAuth();
    if (!user.emailVerified) {
        throw new AuthError("Verificá tu email antes de continuar", 403);
    }
    return user;
}

/**
 * Guard: requires the user to belong to a specific clinic.
 */
export async function requireClinicAccess(clinicId: string): Promise<AuthenticatedUser> {
    const user = await requireAuth();
    if (user.clinicId !== clinicId) {
        throw new AuthError("No tenés acceso a esta clínica", 403);
    }
    return user;
}

/**
 * Custom error class for auth failures. Use in API routes:
 *
 * try {
 *   const user = await requireAuth();
 * } catch (err) {
 *   if (err instanceof AuthError) return err.toResponse();
 *   return NextResponse.json({ error: "Error interno" }, { status: 500 });
 * }
 */
export class AuthError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "AuthError";
    }

    toResponse() {
        return NextResponse.json({ error: this.message }, { status: this.status });
    }
}
