import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WRITE_SCOPES } from '@/lib/google';
import { createHmac } from 'crypto';

function signState(payload: string): string {
    return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(payload).digest('hex');
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const client_id = process.env.GOOGLE_CLIENT_ID;
    const origin = request.nextUrl.origin || 'https://www.liviodental.com';
    const redirect_uri = `${origin}/api/integrations/google/callback`;

    // Sign the state with HMAC to prevent CSRF / token hijacking
    const nonce = crypto.randomUUID();
    const payload = JSON.stringify({ profesionalId: user.id, nonce });
    const sig = signState(payload);
    const state = Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');

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
