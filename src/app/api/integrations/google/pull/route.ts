import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getOAuth2ClientForProfesional } from '@/lib/google';

// Allowed Google event ID characters
const SAFE_EVENT_ID = /^[a-zA-Z0-9_\-]+$/;

export async function POST(request: NextRequest) {
    // Require authenticated session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json().catch(() => ({})) as { profesionalId?: string };
        const adminClient = createAdminClient();

        // If profesionalId is provided, it must match the authenticated user
        // (general background sync is only allowed server-to-server, not from client)
        const requestedId = body.profesionalId;
        if (requestedId && requestedId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let query = adminClient
            .from('professional')
            .select('id, full_name, google_calendar_id, calendar_sync_enabled');

        if (requestedId) {
            query = query.eq('id', requestedId);
        } else {
            query = query.eq('id', user.id);
        }

        const { data: profs, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!profs || profs.length === 0) return NextResponse.json({ synced: 0, message: 'No professionals found' });

        const results: { profesionalId: string; found: number; inserted: number; deleted: number; error?: string }[] = [];
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);

        for (const prof of profs) {
            if (!prof.calendar_sync_enabled) {
                results.push({ profesionalId: prof.id, found: 0, inserted: 0, deleted: 0, error: 'sync_disabled' });
                continue;
            }

            let oauthClient;
            try {
                const { client } = await getOAuth2ClientForProfesional(prof.id);
                oauthClient = client;
            } catch (e: any) {
                results.push({ profesionalId: prof.id, found: 0, inserted: 0, deleted: 0, error: e.message });
                continue;
            }

            const cal = google.calendar({ version: 'v3', auth: oauthClient });
            const calendarId = prof.google_calendar_id || 'primary';

            try {
                const { data: eventsData } = await cal.events.list({
                    calendarId,
                    timeMin: now.toISOString(),
                    timeMax: futureDate.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const events = eventsData.items || [];
                // Sanitize event IDs — reject any that don't match safe pattern
                const googleEventIds = events
                    .map((e: any) => e.id)
                    .filter((id: any): id is string => typeof id === 'string' && SAFE_EVENT_ID.test(id));

                let inserted = 0;
                for (const evt of events) {
                    if (!evt.id || !SAFE_EVENT_ID.test(evt.id)) continue;
                    if (!evt.start?.dateTime && !evt.start?.date) continue;

                    const desde = evt.start.dateTime || `${evt.start.date}T00:00:00`;
                    const hasta = evt.end?.dateTime || `${evt.end?.date}T23:59:59`;

                    const { error: upsertErr } = await adminClient.from('bloqueo_horario').upsert({
                        profesional_id: prof.id,
                        bloqueo_desde: desde,
                        bloqueo_hasta: hasta,
                        tipo: 'externo_google',
                        descripcion: evt.summary || 'Evento externo',
                        google_event_id: evt.id,
                    }, {
                        onConflict: 'profesional_id,bloqueo_desde,bloqueo_hasta',
                        ignoreDuplicates: false
                    });

                    if (!upsertErr) inserted++;
                }

                let deleted = 0;
                if (googleEventIds.length > 0) {
                    // Use the array form to avoid filter injection
                    const { data: stale } = await adminClient
                        .from('bloqueo_horario')
                        .select('id')
                        .eq('profesional_id', prof.id)
                        .eq('tipo', 'externo_google')
                        .not('google_event_id', 'in', `(${googleEventIds.map(id => `"${id}"`).join(',')})`);

                    if (stale && stale.length > 0) {
                        const staleIds = stale.map(s => s.id);
                        await adminClient.from('bloqueo_horario').delete().in('id', staleIds);
                        deleted = staleIds.length;
                    }
                } else {
                    await adminClient
                        .from('bloqueo_horario')
                        .delete()
                        .eq('profesional_id', prof.id)
                        .eq('tipo', 'externo_google');
                }

                results.push({ profesionalId: prof.id, found: events.length, inserted, deleted });
            } catch (err: any) {
                results.push({ profesionalId: prof.id, found: 0, inserted: 0, deleted: 0, error: err.message });
            }
        }

        return NextResponse.json({ success: true, synced: results.length, results });
    } catch (error: any) {
        console.error('[Google Pull] Error:', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
