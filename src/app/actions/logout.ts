"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutAction() {
    const supabase = await createClient();

    // 1. Sign out from Supabase (global scope to clear all tabs)
    await supabase.auth.signOut({ scope: 'global' });

    // 2. Clear ALL cookies manually
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    for (const cookie of allCookies) {
        cookieStore.delete(cookie.name);
    }

    // 3. Return success
    return { success: true };
}
