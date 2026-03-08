import { createClient } from '@/lib/supabase/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Get subscription details
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('mp_preapproval_id, clinica_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!sub?.mp_preapproval_id) {
            return NextResponse.json({ error: 'No se encontró una suscripción activa para este usuario.' }, { status: 404 });
        }

        const mpAccessToken = process.env.MP_ACCESS_TOKEN;
        if (!mpAccessToken) {
            return NextResponse.json({ error: 'Configuración de pago incompleta.' }, { status: 500 });
        }

        const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
        const preApproval = new PreApproval(mpClient);

        // Update status to 'cancelled' in Mercado Pago
        // This stops future billing immediately.
        await preApproval.update({
            id: sub.mp_preapproval_id,
            body: {
                status: 'cancelled'
            }
        });

        // Update local database to reflect cancellation at end of period
        await supabase
            .from('subscriptions')
            .update({
                cancel_at_period_end: true,
                status: 'active' // Keep it active until current_period_ends_at expires
            })
            .eq('clinica_id', sub.clinica_id);

        return NextResponse.json({ success: true, message: 'Suscripción cancelada correctamente. Seguirás teniendo acceso PRO hasta el final del periodo pagado.' });

    } catch (error: any) {
        console.error('[CancelSub] Error:', error);
        return NextResponse.json({
            error: 'No se pudo cancelar la suscripción.',
            details: error.message
        }, { status: 500 });
    }
}
