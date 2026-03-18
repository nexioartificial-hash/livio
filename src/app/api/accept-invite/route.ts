export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
    );

    try {
        const { token, userId, fullName, license } = await request.json();

        if (!token || !userId) {
            return NextResponse.json(
                { error: 'Token y userId son requeridos.' },
                { status: 400 }
            );
        }

        // Verify caller is authenticated and userId matches the session
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user.id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1. Find the invite
        const { data: invite, error: fetchError } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!invite) {
            return NextResponse.json(
                { error: 'Invitación no encontrada o ya aceptada.' },
                { status: 404 }
            );
        }

        // Verify the authenticated user's email matches the invite email
        if (user.email && invite.email && user.email.toLowerCase() !== invite.email.toLowerCase()) {
            return NextResponse.json(
                { error: 'Esta invitación no corresponde a tu cuenta.' },
                { status: 403 }
            );
        }

        // 2. Mark invite as accepted
        await supabaseAdmin
            .from('invites')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', invite.id);

        // 3. Create/update professional profile
        const profileData = {
            id: userId,
            full_name: fullName || invite.inviter_name,
            role: invite.role,
            clinic_id: invite.clinic_id,
            is_onboarded: true,
            ...(license ? { license } : {}),
        };

        const { data: existing } = await supabaseAdmin
            .from('professional')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (existing) {
            await supabaseAdmin.from('professional').update(profileData).eq('id', userId);
        } else {
            await supabaseAdmin.from('professional').insert(profileData);
        }

        // 4. Update user metadata
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                invited: true,
                role: invite.role,
                clinic_id: invite.clinic_id,
                full_name: fullName,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Accept invite error:', error);
        return NextResponse.json(
            { error: 'Error al aceptar invitación' },
            { status: 500 }
        );
    }
}
