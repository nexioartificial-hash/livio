import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { token, userId, fullName, license } = await request.json();

        if (!token || !userId) {
            return NextResponse.json(
                { error: 'Token y userId son requeridos.' },
                { status: 400 }
            );
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

        // 2. Mark invite as accepted
        await supabaseAdmin
            .from('invites')
            .update({
                status: 'accepted',
                updated_at: new Date().toISOString(),
            })
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
            await supabaseAdmin
                .from('professional')
                .update(profileData)
                .eq('id', userId);
        } else {
            await supabaseAdmin
                .from('professional')
                .insert(profileData);
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

        console.log('✅ Invite accepted:', invite.email, '→ role:', invite.role);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Accept invite error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al aceptar invitación' },
            { status: 500 }
        );
    }
}
