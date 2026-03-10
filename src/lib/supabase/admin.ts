import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in server-side API routes, never expose to the client.
 */
export function createAdminClient() {
    return createClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
        (process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"),
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}
