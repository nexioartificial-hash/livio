import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WRITE_SCOPES } from '@/lib/google';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/login', 'https://www.liviodental.com'));
    }

    const client_id = process.env.GOOGLE_CLIENT_ID;
    const redirect_uri = 'https://www.liviodental.com/api/integrations/google/callback';

    // Pass profesionalId as state so callback can persist tokens
    const state = Buffer.from(JSON.stringify({ profesionalId: user.id })).toString('base64');

    const params = new URLSearchParams({
        client_id: client_id || '',
        redirect_uri,
        response_type: 'code',
        scope: WRITE_SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        state,
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
