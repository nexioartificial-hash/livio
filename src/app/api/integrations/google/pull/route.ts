import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOAuth2ClientForProfesional } from '@/lib/google';

/**
 * POST /api/integrations/google/pull
 * Body: { profesionalId?: string }  (omit = pull for ALL sync-enabled profesionals)
 *
 * Fetches Google Calendar events → upserts bloqueo_horario.
 * Deletes stale bloqueos that no longer exist in Google Calendar.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({})) as { profesionalId?: string };
        const supabase = createAdminClient();

        // Load all sync-enabled profesionals (or just one specific)
        let query = supabase
            .from('professional')
            .select('id, full_name, google_calendar_id, calendar_sync_enabled');

        if (body.profesionalId) {
            query = query.eq('id', body.profesionalId);
        } else {
            // General background sync: only those who enabled it
            query = query.eq('calendar_sync_enabled', true);
        }

        const { data: profs, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!profs || profs.length === 0) return NextResponse.json({ synced: 0, message: 'No sync-enabled profesionals' });

        const results: { profesionalId: string; inserted: number; deleted: number; error?: string }[] = [];

        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);

        for (const prof of profs) {
            let oauthClient;
            try {
                const { client } = await getOAuth2ClientForProfesional(prof.id);
                oauthClient = client;
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'token_error';
                results.push({ profesionalId: prof.id, inserted: 0, deleted: 0, error: msg });
                continue;
            }

            const cal = google.calendar({ version: 'v3', auth: oauthClient });
            const calendarId = prof.google_calendar_id || 'primary';

            // Fetch events from Google
            const { data: eventsData } = await cal.events.list({
                calendarId,
                timeMin: now.toISOString(),
                timeMax: futureDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = eventsData.items || [];
            const googleEventIds = events.map((e: { id?: string | null }) => e.id).filter(Boolean) as string[];

            // Upsert bloqueos
            let inserted = 0;
            for (const evt of events) {
                if (!evt.start?.dateTime && !evt.start?.date) continue;
                const desde = evt.start.dateTime || `${evt.start.date}T00:00:00Z`;
                const hasta = evt.end?.dateTime || `${evt.end?.date}T23:59:59Z`;

                const { error: upsertErr } = await supabase.from('bloqueo_horario').upsert({
                    profesional_id: prof.id,
                    bloqueo_desde: desde,
                    bloqueo_hasta: hasta,
                    tipo: 'externo_google',
                    descripcion: evt.summary || 'Evento externo',
                    google_event_id: evt.id,
                }, { onConflict: 'profesional_id,bloqueo_desde,bloqueo_hasta', ignoreDuplicates: true });

                if (!upsertErr) inserted++;
            }

            // Delete stale bloqueos (google_event_id no longer in Google Calendar)
            let deleted = 0;
            if (googleEventIds.length > 0) {
                const { data: stale } = await supabase
                    .from('bloqueo_horario')
                    .select('id, google_event_id')
                    .eq('profesional_id', prof.id)
                    .eq('tipo', 'externo_google')
                    .not('google_event_id', 'in', `(${googleEventIds.map(id => `"${id}"`).join(',')})`);

                if (stale && stale.length > 0) {
                    const staleIds = stale.map(s => s.id);
                    await supabase.from('bloqueo_horario').delete().in('id', staleIds);
                    deleted = staleIds.length;
                }
            }

            results.push({ profesionalId: prof.id, inserted, deleted });
        }

        return NextResponse.json({ synced: results.length, results });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Google Pull] Error:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
