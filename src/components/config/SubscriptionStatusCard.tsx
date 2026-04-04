"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { DateTime } from "luxon";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    trialing: { label: "En prueba", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
    active: { label: "Activa", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    past_due: { label: "Pago pendiente", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    canceled: { label: "Cancelada", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

const PLAN_LABELS: Record<string, string> = {
    trial: "Trial",
    pro: "Pro",
};

export function SubscriptionStatusCard() {
    const { subscription, loading, daysLeft, startCheckout, isCheckoutLoading } = useSubscription();

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (!subscription) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Suscripción
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No hay suscripción activa.</p>
                    <Button
                        onClick={startCheckout}
                        disabled={isCheckoutLoading}
                        className="mt-4 bg-[#2DD4A8] hover:bg-[#2DD4A8]/90 text-slate-900"
                    >
                        {isCheckoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Comenzar prueba gratuita
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const status = STATUS_CONFIG[subscription.status] ?? STATUS_CONFIG.canceled;
    const planLabel = PLAN_LABELS[subscription.plan] ?? subscription.plan;

    const renewalDate = subscription.current_period_ends_at
        ? DateTime.fromISO(subscription.current_period_ends_at).setLocale("es").toLocaleString(DateTime.DATE_FULL)
        : null;

    const trialEndDate = subscription.trial_ends_at
        ? DateTime.fromISO(subscription.trial_ends_at).setLocale("es").toLocaleString(DateTime.DATE_FULL)
        : null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Suscripción
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge className={`border-0 text-xs font-medium ${status.color}`}>
                            {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            Plan {planLabel}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {subscription.status === "trialing" && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-4">
                        <p className="text-sm">
                            Tu prueba gratuita vence el <span className="font-semibold">{trialEndDate}</span>
                            {daysLeft != null && <> ({daysLeft} {daysLeft === 1 ? "día" : "días"} restantes)</>}
                        </p>
                        <Button
                            onClick={startCheckout}
                            disabled={isCheckoutLoading}
                            size="sm"
                            className="mt-3 bg-[#2DD4A8] hover:bg-[#2DD4A8]/90 text-slate-900"
                        >
                            {isCheckoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Upgrade a Pro
                        </Button>
                    </div>
                )}

                {subscription.status === "active" && renewalDate && (
                    <div className="rounded-lg border p-4">
                        <p className="text-sm">
                            Próxima renovación: <span className="font-semibold">{renewalDate}</span>
                        </p>
                        <a
                            href="/api/cancel-subscription"
                            className="mt-3 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                            Cancelar suscripción
                        </a>
                    </div>
                )}

                {subscription.status === "past_due" && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4">
                        <p className="text-sm">Tenés un pago pendiente. Tu acceso podría verse limitado.</p>
                        <Button
                            onClick={startCheckout}
                            disabled={isCheckoutLoading}
                            size="sm"
                            variant="destructive"
                            className="mt-3"
                        >
                            {isCheckoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reintentar pago
                        </Button>
                    </div>
                )}

                {subscription.status === "canceled" && (
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Tu suscripción fue cancelada.</p>
                        <Button
                            onClick={startCheckout}
                            disabled={isCheckoutLoading}
                            size="sm"
                            className="mt-3 bg-[#2DD4A8] hover:bg-[#2DD4A8]/90 text-slate-900"
                        >
                            {isCheckoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reactivar suscripción
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
