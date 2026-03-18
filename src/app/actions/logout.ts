"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Auth cookies created by Supabase SSR
const AUTH_COOKIE_PATTERN = /^sb-.+-(auth-token|auth-token-code-verifier)$/;

export async function logoutAction() {
    const supabase = await createClient();

    // 1. Sign out from Supabase (global scope to clear all tabs)
    await supabase.auth.signOut({ scope: 'global' });

    // 2. Only delete auth-related cookies, not all cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    for (const cookie of allCookies) {
        if (
            AUTH_COOKIE_PATTERN.test(cookie.name) ||
            cookie.name === 'livio_remember_me'
        ) {
            cookieStore.delete(cookie.name);
        }
    }

    return { success: true };
}
