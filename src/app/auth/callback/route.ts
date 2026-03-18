import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

        if (session?.user) {
            const user = session.user;
            const supabaseAdmin = createSupabaseClient(
                (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
                (process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key")
            );

            const { data: profile } = await supabaseAdmin
                .from('professional')
                .select('id, clinic_id')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                // New user: create profile with limited role (profesional, not superadmin)
                // clinic_id is null until they complete onboarding
                const { error: profError } = await supabaseAdmin.from('professional').insert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario',
                    role: 'profesional',
                    is_onboarded: false,
                    clinic_id: null,
                });

                if (profError) console.error('[AuthCallback] Error creating professional:', profError);
            }
        }
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
}
