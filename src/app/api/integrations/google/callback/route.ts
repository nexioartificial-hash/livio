
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    // HARDCODED for stability during debugging - MUST MATCH AUTH ROUTE EXACTLY
    const REDIRECT_URI = 'https://www.liviodental.com/api/integrations/google/callback';

    // Verify environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const debugInfo = {
        NODE_ENV: process.env.NODE_ENV,
        HAS_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        HAS_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        CLIENT_ID_TYPE: typeof process.env.GOOGLE_CLIENT_ID,
        ENV_KEYS_COUNT: Object.keys(process.env).length,
        // Check if maybe there's a typo like 'GOOGLE_CLIENT_ID ' (with space)
        KEYS_STARTING_WITH_GOOGLE: Object.keys(process.env).filter(k => k.startsWith('GOOGLE'))
      };
      console.error('Missing Google Credentials', debugInfo);
      return NextResponse.json({
        error: 'Server Misconfiguration: Missing Google Credentials',
        debug: debugInfo
      }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch next 30 days events
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(now.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: nextMonth.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Return HTML that posts message to opener and closes window
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'GOOGLE_CALENDAR_SUCCESS', events: ${JSON.stringify(events)} }, '*');
            window.close();
          </script>
          <p>Conectado exitosamente. Cerrando ventana...</p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('Google Auth Error:', error);
    const errorDetails = error.response ? error.response.data : error.message;
    return NextResponse.json({
      error: 'Google Auth Failed',
      details: errorDetails,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    }, { status: 500 });
  }
}
