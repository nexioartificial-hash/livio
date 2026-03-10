import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    const isRememberMe = cookieStore.get('livio_remember_me')?.value === 'true'

    return createServerClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"),
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        if (!isRememberMe) {
                            delete options.maxAge;
                            delete options.expires;
                        }
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options, maxAge: 0 })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                    }
                },
            },
        }
    )
}
