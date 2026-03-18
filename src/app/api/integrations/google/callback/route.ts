import { google } from 'googleapis';
import { NextResponse, NextRequest } from 'next/server';
import { buildOAuth2Client } from '@/lib/google';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac, timingSafeEqual } from 'crypto';

function signState(payload: string): string {
    return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(payload).digest('hex');
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateRaw = searchParams.get('state');
    const origin = request.nextUrl.origin;
    const redirect_uri = `${origin}/api/integrations/google/callback`;

    const errorResponse = (reason: string) => {
        return new NextResponse(
            `<html><body><script>
        window.opener?.postMessage({ type: 'GOOGLE_AUTH_ERROR', reason: '${reason}' }, '*');
        window.close();
      </script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    };

    if (!code || !stateRaw) return errorResponse('missing_params');

    // Decode and verify HMAC-signed state
    let profesionalId: string;
    try {
        const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
        const { payload, sig } = decoded;
        if (!payload || !sig) throw new Error('malformed_state');

        const expectedSig = signState(payload);
        const sigMatch = timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(sig, 'hex'));
        if (!sigMatch) throw new Error('invalid_signature');

        const parsed = JSON.parse(payload);
        profesionalId = parsed.profesionalId;
        if (!profesionalId) throw new Error('No profesionalId in state');
    } catch {
        return errorResponse('invalid_state');
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return errorResponse('misconfigured');
    }

    try {
        const oauth2Client = buildOAuth2Client(redirect_uri);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: googleUser } = await oauth2.userinfo.get();

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        let calendarId = 'primary';
        try {
            const { data: cal } = await calendar.calendars.get({ calendarId: 'primary' });
            calendarId = cal.id || 'primary';
        } catch {
            // fallback to 'primary'
        }

        const supabase = createAdminClient();
        const { error: updateError } = await supabase.from('professional').update({
            google_calendar_id: calendarId,
            google_user_email: googleUser.email,
            google_access_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token,
            google_token_expires_at: tokens.expiry_date
                ? new Date(tokens.expiry_date).toISOString()
                : null,
        }).eq('id', profesionalId);

        if (updateError) {
            console.error('[Google Callback] DB update error:', updateError);
            return errorResponse('db_error');
        }

        return new NextResponse(
            `<html><body><script>
        window.opener?.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', email: '${googleUser.email}' }, '*');
        window.close();
      </script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'unknown';
        console.error('[Google Callback] Error:', msg);
        return errorResponse('auth_error');
    }
}
