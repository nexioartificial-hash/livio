
import { NextResponse } from 'next/server';

export async function GET() {
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.liviodental.com';
    const client_id = process.env.GOOGLE_CLIENT_ID;
    // HARDCODED for stability - MUST MATCH CALLBACK ROUTE EXACTLY
    const redirect_uri = 'https://www.liviodental.com/api/integrations/google/callback';

    const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly'
    ].join(' ');

    const params = new URLSearchParams({
        client_id: client_id || '',
        redirect_uri: redirect_uri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true'
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
