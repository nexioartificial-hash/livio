import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: profile } = await supabaseAdmin
                .from('professional')
                .select('id, clinic_id')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                console.log('🆕 [AuthCallback] Creating profile for:', user.email);

                // 1. Create professional
                const { error: profError } = await supabaseAdmin.from('professional').insert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Dr. Usuario',
                    role: 'superadmin',
                    is_onboarded: true,
                    clinic_id: '0cbc18ab-ca2f-4482-9aec-8a251f5d3f6f' // Link to meta clinic for review
                });

                if (profError) console.error('❌ [AuthCallback] Error creating professional:', profError);

                // 2. Ensure subscription exists for this clinic
                await supabaseAdmin.from('subscriptions').upsert({
                    clinica_id: '0cbc18ab-ca2f-4482-9aec-8a251f5d3f6f',
                    user_id: user.id,
                    plan: 'trial',
                    status: 'trialing'
                }, { onConflict: 'clinica_id' });
            }
        }
    }

    // Refresh the router on landing
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    return response;
}

import { NextResponse } from 'next/server';
