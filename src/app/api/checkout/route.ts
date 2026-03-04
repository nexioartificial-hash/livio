import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({
                error: 'No autorizado',
                details: 'Debes iniciar sesión. ' + (authError?.message || '')
            }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRole);

        // Get clinic_id
        const { data: prof } = await supabaseAdmin
            .from('professional')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle();

        if (!prof?.clinic_id) {
            return NextResponse.json({ error: 'Tu usuario no tiene una clínica asociada o no se encuentra el perfil.' }, { status: 404 });
        }

        const clinicId = prof.clinic_id;
        const mpAccessToken = process.env.MP_ACCESS_TOKEN;

        if (!mpAccessToken) {
            return NextResponse.json({ error: 'Falta configuración de pago (MP Token).' }, { status: 500 });
        }

        const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
        const preference = new Preference(mpClient);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.liviodental.com';

        const result = await preference.create({
            body: {
                items: [{
                    id: 'livio-pro',
                    title: 'Livio PRO - Suscripción Mensual',
                    unit_price: 99000,
                    quantity: 1,
                    currency_id: 'ARS',
                }],
                back_urls: {
                    success: `${siteUrl}/success`,
                    failure: `${siteUrl}/dashboard`,
                    pending: `${siteUrl}/dashboard`,
                },
                auto_return: 'approved',
                notification_url: `${siteUrl}/api/mp-webhook`,
                metadata: {
                    clinica_id: clinicId,
                    user_id: user.id
                },
            },
        });

        // Bookkeeping
        await supabaseAdmin.from('subscriptions').upsert({
            clinica_id: clinicId,
            user_id: user.id,
            mp_preference_id: result.id,
            plan: 'pro',
            status: 'pending'
        }, { onConflict: 'clinica_id' });

        return NextResponse.json({
            init_point: result.init_point,
            preference_id: result.id
        });

    } catch (error: any) {
        console.error('[Checkout] Error:', error);
        return NextResponse.json({
            error: 'Error interno inesperado',
            details: error.message
        }, { status: 500 });
    }
}
