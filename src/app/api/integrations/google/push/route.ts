import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getOAuth2ClientForProfesional, turnoToGoogleEvent } from '@/lib/integrations/google';

export async function POST(request: NextRequest) {
    // Require authenticated session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { turnoId, action } = await request.json() as {
            turnoId: string;
            action: 'create' | 'update' | 'delete';
        };

        if (!turnoId || !action) {
            return NextResponse.json({ error: 'turnoId and action are required' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        const { data: turno, error: turnoError } = await adminClient
            .from('turno')
            .select('*')
            .eq('id', turnoId)
            .single();

        if (turnoError || !turno) {
            return NextResponse.json({ error: 'Turno not found' }, { status: 404 });
        }

        // Verify the turno belongs to the caller's clinic
        const { data: callerProf } = await adminClient
            .from('professional')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!callerProf || callerProf.clinic_id !== turno.clinic_id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: prof } = await adminClient
            .from('professional')
            .select('id, calendar_sync_enabled, google_calendar_id')
            .eq('full_name', turno.professional_name)
            .maybeSingle();

        if (!prof || !prof.calendar_sync_enabled) {
            return NextResponse.json({ skipped: true, reason: 'sync_disabled_or_no_match' });
        }

        let oauthClient;
        try {
            const { client } = await getOAuth2ClientForProfesional(prof.id);
            oauthClient = client;
        } catch {
            return NextResponse.json({ skipped: true, reason: 'no_token' });
        }

        const cal = google.calendar({ version: 'v3', auth: oauthClient });
        const calendarId = prof.google_calendar_id || 'primary';

        if (action === 'delete') {
            if (turno.google_event_id) {
                await cal.events.delete({ calendarId, eventId: turno.google_event_id }).catch(() => { });
                await adminClient.from('turno').update({ google_event_id: null }).eq('id', turnoId);
            }
            return NextResponse.json({ success: true, action: 'deleted' });
        }

        const eventBody = turnoToGoogleEvent({
            patient_name: turno.patient_name,
            reason: turno.reason,
            date: turno.date,
            time: turno.time,
            duration: turno.duration,
            professional_name: turno.professional_name,
            obra_social: turno.obra_social,
        });

        if (action === 'create' || !turno.google_event_id) {
            const { data: created } = await cal.events.insert({ calendarId, requestBody: eventBody });
            await adminClient.from('turno').update({ google_event_id: created?.id }).eq('id', turnoId);
            return NextResponse.json({ success: true, action: 'created', googleEventId: created?.id });
        }

        await cal.events.update({ calendarId, eventId: turno.google_event_id, requestBody: eventBody });
        return NextResponse.json({ success: true, action: 'updated' });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Google Push] Error:', msg);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
