import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { searchParams } = new URL(req.url);
        const type = body.type || searchParams.get('type');

        if (type === 'payment') {
            const paymentId = body.data?.id || searchParams.get('data.id');

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

                // Extract clinical_id and plan from metadata
                const { clinica_id } = payment.metadata;

                // Update subscription
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
