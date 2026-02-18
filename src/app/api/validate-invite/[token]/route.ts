import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const { data: invite, error } = await supabaseAdmin
            .from('invites')
            .select('id, email, role, clinic_id, inviter_name, status, created_at')
            .eq('token', token)
            .maybeSingle();

        if (error) throw error;

        if (!invite) {
            return NextResponse.json(
                { error: 'Invitación no encontrada.' },
                { status: 404 }
            );
        }

        if (invite.status === 'accepted') {
            return NextResponse.json(
                { error: 'Esta invitación ya fue aceptada.' },
                { status: 410 }
            );
        }

        if (invite.status === 'cancelled' || invite.status === 'expired') {
            return NextResponse.json(
                { error: 'Esta invitación fue cancelada o expiró.' },
                { status: 410 }
            );
        }

        // Check if expired (24h)
        const createdAt = new Date(invite.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            // Mark as expired
            await supabaseAdmin
                .from('invites')
                .update({ status: 'expired' })
                .eq('id', invite.id);

            return NextResponse.json(
                { error: 'Esta invitación expiró (más de 24 horas).' },
                { status: 410 }
            );
        }

        return NextResponse.json({ invite });
    } catch (error: any) {
        console.error('Validate invite error:', error);
        return NextResponse.json(
            { error: 'Error al validar invitación.' },
            { status: 500 }
        );
    }
}
