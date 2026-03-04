import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOAuth2ClientForProfesional, turnoToGoogleEvent } from '@/lib/google';

/**
 * POST /api/integrations/google/push
 * Body: { turnoId: string, action: 'create' | 'update' | 'delete' }
 *
 * Syncs a Livio turno to Google Calendar.
 * Silently no-ops if profesional has calendar_sync_enabled = false.
 */
export async function POST(request: NextRequest) {
    try {
        const { turnoId, action } = await request.json() as {
            turnoId: string;
            action: 'create' | 'update' | 'delete';
        };

        if (!turnoId || !action) {
            return NextResponse.json({ error: 'turnoId and action are required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Load the turno
        const { data: turno, error: turnoError } = await supabase
            .from('turno')
            .select('*')
            .eq('id', turnoId)
            .single();

        if (turnoError || !turno) {
            return NextResponse.json({ error: 'Turno not found' }, { status: 404 });
        }

        // Find the profesional by name (turno stores professional_name as text)
        const { data: prof } = await supabase
            .from('professional')
            .select('id, calendar_sync_enabled, google_calendar_id')
            .eq('full_name', turno.professional_name)
            .maybeSingle();

        // Silently skip if no matching professional or sync disabled
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
                await supabase.from('turno').update({ google_event_id: null }).eq('id', turnoId);
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
            await supabase.from('turno').update({ google_event_id: created?.id }).eq('id', turnoId);
            return NextResponse.json({ success: true, action: 'created', googleEventId: created?.id });
        }

        // update
        await cal.events.update({ calendarId, eventId: turno.google_event_id, requestBody: eventBody });
        return NextResponse.json({ success: true, action: 'updated' });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Google Push] Error:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
