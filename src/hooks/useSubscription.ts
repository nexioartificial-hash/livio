import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { DateTime } from 'luxon';

export interface Subscription {
    id: string;
    clinica_id: string;
    plan: 'trial' | 'pro';
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    trial_ends_at: string;
    current_period_ends_at: string | null;
}

export function useSubscription() {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSubscription = async () => {
        if (!user?.clinic_id) return;

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('clinica_id', user.clinic_id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setSubscription(data);
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [user?.clinic_id]);

    const daysLeft = subscription?.trial_ends_at
        ? Math.ceil(DateTime.fromISO(subscription.trial_ends_at).diffNow('days').days)
        : 0;

    const isTrialExpired = daysLeft <= 0 && subscription?.status === 'trialing';
    const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';

    return {
        subscription,
        loading,
        daysLeft,
        isTrialExpired,
        isPro,
        refresh: fetchSubscription,
    };
}
