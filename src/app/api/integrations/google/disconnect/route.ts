import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    // Require authenticated session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { profesionalId } = await request.json() as { profesionalId: string };
        if (!profesionalId) {
            return NextResponse.json({ error: 'profesionalId requerido' }, { status: 400 });
        }

        // Only allow disconnecting your own integration
        if (profesionalId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const adminClient = createAdminClient();

        const { error: profErr } = await adminClient
            .from('professional')
            .update({
                google_access_token: null,
                google_refresh_token: null,
                google_token_expires_at: null,
                google_calendar_id: null,
                calendar_sync_enabled: false,
            })
            .eq('id', profesionalId);

        if (profErr) throw profErr;

        const { error: bloqueoErr } = await adminClient
            .from('bloqueo_horario')
            .delete()
            .eq('profesional_id', profesionalId)
            .eq('tipo', 'externo_google');

        if (bloqueoErr) throw bloqueoErr;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Google Disconnect]', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
