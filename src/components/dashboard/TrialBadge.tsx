"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TrialBadge() {
    const { subscription, loading, daysLeft, isTrialExpired, isPro } = useSubscription();
    const [isUpgrading, setIsUpgrading] = useState(false);

    if (loading) return <Loader2 className="h-4 w-4 animate-spin opacity-20" />;

    const handleUpgrade = async () => {
        window.location.href = '/#pricing';
    };

    if (isPro) {
        return (
            <div className="bg-[#76D7B6]/10 text-[#76D7B6] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-[#76D7B6]/20">
                <Rocket className="h-3 w-3" />
                PLAN PRO
            </div>
        );
    }

    // Trial 30 days logic for progress bar
    const progress = Math.max(0, Math.min(100, (daysLeft / 30) * 100));

    return (
        <div className="px-0 pb-4">
            <div className={cn(
                "rounded-xl p-4 text-white shadow-lg transition-transform duration-300 hover:scale-[1.02]",
                daysLeft > 0 && daysLeft <= 3
                    ? "bg-gradient-to-br from-red-950 to-red-900 border border-red-500/30"
                    : daysLeft <= 0 && !isPro
                        ? "bg-slate-900 opacity-80"
                        : "bg-gradient-to-br from-slate-900 to-slate-800"
            )}>
                <div className="mb-2 flex items-center justify-between">
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isPro
                            ? "bg-[#76D7B6]/20 text-[#76D7B6]"
                            : daysLeft > 3
                                ? "bg-[#76D7B6]/20 text-[#76D7B6]"
                                : daysLeft > 0
                                    ? "bg-red-500/20 text-red-500 animate-pulse"
                                    : "bg-red-500/20 text-red-500"
                    )}>
                        {isPro ? "PLAN PRO" : daysLeft > 0 ? "TRIAL ACTIVO" : "TRIAL EXPIRADO"}
                    </span>
                    {!isPro && (
                        <span className={cn(
                            "text-xs font-bold",
                            daysLeft <= 3 ? "text-red-400" : "text-slate-400"
                        )}>{daysLeft}d</span>
                    )}
                </div>

                <p className="mb-3 text-[11px] text-slate-300 leading-tight">
                    {isPro
                        ? "¡Gracias por ser PRO! Tienes acceso ilimitado a todas las funciones."
                        : daysLeft > 0
                            ? daysLeft <= 3
                                ? "Tu prueba está por terminar. ¡Actualiza ahora!"
                                : "Tienes acceso total. Actualiza para mantener tus datos."
                            : "Tu prueba ha terminado. Actualiza para seguir usando Livio."}
                </p>

                {!isPro && (
                    <Button
                        onClick={handleUpgrade}
                        className={cn(
                            "w-full rounded-lg py-2 text-xs font-bold transition-colors h-9",
                            daysLeft <= 3
                                ? "bg-red-500 text-white hover:bg-red-600 border-none"
                                : "bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8] border-none"
                        )}
                    >
                        MEJORAR A PRO
                    </Button>
                )}
            </div>
        </div>
    );
}
