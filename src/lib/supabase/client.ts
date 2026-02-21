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
            // Using a flexible signature to handle different library versions.
            lock: async (...args: any[]) => {
                const acquire = args.find(arg => typeof arg === 'function');
                if (acquire) return await acquire();
            },
        }
    })
}

// Singleton for client-side usage
export const supabase = createClient()
