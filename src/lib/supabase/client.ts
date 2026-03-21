import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.warn('[Supabase] Missing env vars. Auth features disabled.')
        return createBrowserClient(
            'https://placeholder.supabase.co',
            'placeholder-key'
        )
    }

    return createBrowserClient(supabaseUrl, supabaseKey, {
        auth: {
            // Disable browser locking to avoid "Navigator LockManager lock timed out" in Chromium.
            lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                return await fn();
            },
        }
    })
}

// Singleton for client-side usage
export const supabase = createClient()
