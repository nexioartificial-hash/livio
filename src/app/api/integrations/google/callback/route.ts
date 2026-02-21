import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { buildOAuth2Client } from '@/lib/google';
import { createAdminClient } from '@/lib/supabase/admin';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const origin = new URL(request.url).origin;

  const errorResponse = (reason: string) => {
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', reason: '${reason}' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  };

  if (!code || !stateRaw) return errorResponse('missing_params');

  // Decode state → profesionalId
  let profesionalId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateRaw, 'base64').toString());
    profesionalId = decoded.profesionalId;
    if (!profesionalId) throw new Error('No profesionalId in state');
  } catch {
    return errorResponse('invalid_state');
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return errorResponse('misconfigured');
  }

  try {
    const redirect_uri = `${origin}/api/integrations/google/callback`;
    const oauth2Client = buildOAuth2Client(redirect_uri);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email from Google profile
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    // Get primary calendar ID
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    let calendarId = 'primary';
    try {
      const { data: cal } = await calendar.calendars.get({ calendarId: 'primary' });
      calendarId = cal.id || 'primary';
    } catch {
      // fallback to 'primary' — not a blocking error
    }

    // Persist tokens to professional table
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
        window.opener.postMessage({ 
          type: 'GOOGLE_AUTH_SUCCESS', 
          email: '${googleUser.email}' 
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown';
    console.error('[Google Callback] Error:', msg);
    return errorResponse(msg);
  }
}
