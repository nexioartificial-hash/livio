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
    const { user, loading: authLoading } = useAuth() as { user: (any & { clinic_id?: string; trial_ends_at?: string }) | null; loading: boolean };
    // Simplified global state for subscription to sync between components
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    const fetchSubscription = async () => {
        if (authLoading) return; // Wait for auth to settle before concluding no clinic
        if (!user?.clinic_id) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('clinica_id', user.clinic_id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            // Update state
            setSubscription(data);
            
            // Dispatch a custom event to notify other hook instances
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('subscription-updated', { detail: data }));
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const startCheckout = async () => {
        setIsCheckoutLoading(true);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error(data.error || 'Error al iniciar checkout');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('No se pudo iniciar el proceso de pago. Por favor intenta de nuevo.');
        } finally {
            setIsCheckoutLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();

        // Listen for updates from other components
        const handleGlobalUpdate = (event: any) => {
            setSubscription(event.detail);
            setLoading(false);
        };

        window.addEventListener('subscription-updated', handleGlobalUpdate);
        return () => window.removeEventListener('subscription-updated', handleGlobalUpdate);
    }, [user?.clinic_id, authLoading]);

    const daysLeft = loading
        ? null
        : subscription?.trial_ends_at
            ? Math.max(0, Math.ceil(DateTime.fromISO(subscription.trial_ends_at).diffNow('days').days))
            : 0;

    const trialProgress = daysLeft == null ? 0 : Math.max(0, Math.min(100, (daysLeft / 30) * 100));

    const isTrialExpired = daysLeft != null && daysLeft <= 0 && subscription?.status === 'trialing';
    const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';

    return {
        subscription,
        loading,
        daysLeft,            // null while loading, number once loaded
        trialProgress,
        isTrialExpired,
        isPro,
        startCheckout,
        isCheckoutLoading,
        refresh: fetchSubscription,
    };
}
