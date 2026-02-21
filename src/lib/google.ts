import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';

const REDIRECT_URI = 'https://www.liviodental.com/api/integrations/google/callback';

// ─── Scopes ──────────────────────────────────────────────────────────────────
export const WRITE_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
];

// ─── Base OAuth client (no credentials) ──────────────────────────────────────
export function buildOAuth2Client(redirectUri?: string) {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri || REDIRECT_URI
    );
}

// ─── Load profesional's tokens from DB and return a ready OAuth2Client ───────
export async function getOAuth2ClientForProfesional(profesionalId: string) {
    const supabase = createAdminClient();

    const { data: prof, error } = await supabase
        .from('professional')
        .select('google_access_token, google_refresh_token, google_token_expires_at, google_calendar_id, calendar_sync_enabled')
        .eq('id', profesionalId)
        .single();

    if (error || !prof) throw new Error(`Profesional ${profesionalId} no encontrado`);
    if (!prof.google_refresh_token) throw new Error(`Profesional ${profesionalId} no tiene Google Calendar conectado`);

    const client = buildOAuth2Client();
    client.setCredentials({
        access_token: prof.google_access_token,
        refresh_token: prof.google_refresh_token,
        expiry_date: prof.google_token_expires_at ? new Date(prof.google_token_expires_at).getTime() : undefined,
    });

    return { client, calendarId: prof.google_calendar_id || 'primary', syncEnabled: prof.calendar_sync_enabled };
}

// ─── Refresh token if expired, persist to DB ─────────────────────────────────
export async function refreshGoogleToken(profesionalId: string) {
    const supabase = createAdminClient();
    const { client } = await getOAuth2ClientForProfesional(profesionalId);

    // googleapis auto-refreshes when making calls, but we force it here to persist
    const { credentials } = await client.refreshAccessToken();

    await supabase.from('professional').update({
        google_access_token: credentials.access_token,
        google_token_expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
    }).eq('id', profesionalId);

    client.setCredentials(credentials);
    return client;
}

// ─── Validate that a profesional has a valid (non-expired) token ─────────────
export async function validateToken(profesionalId: string): Promise<boolean> {
    const supabase = createAdminClient();
    const { data: prof } = await supabase
        .from('professional')
        .select('google_refresh_token, google_token_expires_at, calendar_sync_enabled')
        .eq('id', profesionalId)
        .single();

    if (!prof?.google_refresh_token) return false;
    return true; // has refresh token → can always get a valid access token
}

// ─── Map a Livio turno to a Google Calendar Event body ───────────────────────
export function turnoToGoogleEvent(turno: {
    patient_name: string;
    reason?: string;
    date: string;
    time: string;
    duration: number;
    professional_name?: string;
    obra_social?: string;
}) {
    const startISO = `${turno.date}T${turno.time}:00`;
    const start = new Date(startISO);
    const end = new Date(start.getTime() + (turno.duration || 30) * 60 * 1000);

    return {
        summary: `${turno.patient_name}${turno.reason ? ` — ${turno.reason}` : ''}`,
        description: [
            turno.professional_name ? `Profesional: ${turno.professional_name}` : null,
            turno.obra_social ? `Obra Social: ${turno.obra_social}` : null,
            'Creado desde Livio Dental',
        ].filter(Boolean).join('\n'),
        start: { dateTime: start.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: end.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
        source: {
            title: 'Livio Dental',
            url: 'https://liviodental.com',
        },
    };
}
