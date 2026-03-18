import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export async function POST(req: Request) {
    try {
        // --- HMAC Signature Verification ---
        const xSignature = req.headers.get('x-signature') ?? '';
        const xRequestId = req.headers.get('x-request-id') ?? '';
        const rawBody = await req.text();

        const webhookSecret = process.env.MP_WEBHOOK_SECRET;
        if (webhookSecret) {
            const tsMatch = xSignature.match(/ts=([^,]+)/);
            const v1Match = xSignature.match(/v1=([^,]+)/);
            const ts = tsMatch?.[1] ?? '';
            const v1 = v1Match?.[1] ?? '';

            if (!ts || !v1) {
                return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
            }

            const signedData = `id:${xRequestId};request-date:${ts};version:v1;${rawBody}`;
            const expected = createHmac('sha256', webhookSecret).update(signedData).digest('hex');

            let signaturesMatch = false;
            try {
                signaturesMatch = timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
            } catch {
                signaturesMatch = false;
            }

            if (!signaturesMatch) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const body = JSON.parse(rawBody);
        const { searchParams } = new URL(req.url);
        const type = body.type || searchParams.get('type');

        if (type === 'payment') {
            const paymentId = body.data?.id || searchParams.get('data.id');
            if (!paymentId) {
                return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
            }

            // Fetch payment details from MP
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment details');
            }

            const payment = await response.json();

            if (payment.status === 'approved') {
                const supabase = await createClient();

                const { clinica_id } = payment.metadata;
                if (!clinica_id) {
                    return NextResponse.json({ error: 'Missing clinica_id in metadata' }, { status: 400 });
                }

                const { error } = await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        mp_payment_id: paymentId.toString(),
                        plan: 'pro',
                        current_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    })
                    .eq('clinica_id', clinica_id);

                if (error) throw error;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
