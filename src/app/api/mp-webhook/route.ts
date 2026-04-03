import { createAdminClient } from '@/lib/supabase/admin';
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
        const supabase = createAdminClient();

        // --- Handle subscription preapproval events ---
        if (type === 'subscription_preapproval') {
            const preapprovalId = body.data?.id;
            if (!preapprovalId) {
                return NextResponse.json({ error: 'Missing preapproval id' }, { status: 400 });
            }

            // Fetch preapproval details from MP
            const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
                headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch preapproval details');
            }

            const preapproval = await response.json();
            const clinicId = preapproval.external_reference;

            if (!clinicId) {
                return NextResponse.json({ error: 'Missing external_reference' }, { status: 400 });
            }

            if (preapproval.status === 'authorized') {
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        plan: 'pro',
                        mp_preapproval_id: preapprovalId,
                        current_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    })
                    .eq('clinica_id', clinicId);
            } else if (preapproval.status === 'paused') {
                await supabase
                    .from('subscriptions')
                    .update({ status: 'past_due' })
                    .eq('clinica_id', clinicId);
            } else if (preapproval.status === 'cancelled') {
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'canceled',
                        cancel_at_period_end: true,
                    })
                    .eq('clinica_id', clinicId);
            }

            await supabase.from('payment_history').insert({
                clinic_id: clinicId,
                event_type: `subscription_${preapproval.status}`,
                mp_id: preapproval.id,
                amount: preapproval.auto_recurring?.transaction_amount ?? null,
                currency: preapproval.auto_recurring?.currency_id ?? 'ARS',
                status: preapproval.status,
                details: { payer_email: preapproval.payer_email, reason: preapproval.reason },
            });
        }

        // --- Handle individual payment events (renewal payments) ---
        if (type === 'payment') {
            const paymentId = body.data?.id || searchParams.get('data.id');
            if (!paymentId) {
                return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
            }

            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment details');
            }

            const payment = await response.json();

            if (payment.status === 'approved') {
                // For recurring payments, external_reference has the clinic ID
                const clinicId = payment.external_reference || payment.metadata?.clinica_id;
                if (!clinicId) {
                    return NextResponse.json({ error: 'Missing clinica_id' }, { status: 400 });
                }

                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        plan: 'pro',
                        mp_payment_id: paymentId.toString(),
                        current_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    })
                    .eq('clinica_id', clinicId);

                await supabase.from('payment_history').insert({
                    clinic_id: clinicId,
                    event_type: 'payment_approved',
                    mp_id: String(payment.id),
                    amount: payment.transaction_amount,
                    currency: payment.currency_id ?? 'ARS',
                    status: 'approved',
                    details: { payer_email: payment.payer?.email, description: payment.description },
                });
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
