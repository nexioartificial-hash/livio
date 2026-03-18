"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TrialBadge({ collapsed = false }: { collapsed?: boolean }) {
    const { subscription, loading, daysLeft, isTrialExpired, isPro } = useSubscription();
    const [isUpgrading, setIsUpgrading] = useState(false);

    if (loading) return <Loader2 className="h-4 w-4 animate-spin opacity-20" />;

    const handleUpgrade = async () => {
        window.location.href = '/#pricing';
    };

    // daysLeft is null while loading (guarded above), safe to assert
    const days = daysLeft ?? 0;

    if (isPro) {
        if (collapsed) {
            return (
                <div className="flex justify-center pb-3">
                    <div className="bg-[#76D7B6]/10 text-[#76D7B6] p-2 rounded-full border border-[#76D7B6]/20">
                        <Rocket className="h-4 w-4" />
                    </div>
                </div>
            );
        }
        return (
            <div className="bg-[#76D7B6]/10 text-[#76D7B6] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-[#76D7B6]/20">
                <Rocket className="h-3 w-3" />
                PLAN PRO
            </div>
        );
    }

    if (collapsed) {
        return (
            <div className="pb-3">
                <div className={cn(
                    "rounded-xl p-3 text-white shadow-lg flex flex-col items-center gap-2",
                    days > 0 && days <= 3
                        ? "bg-gradient-to-br from-red-950 to-red-900 border border-red-500/30"
                        : days <= 0
                            ? "bg-slate-900 opacity-80"
                            : "bg-gradient-to-br from-slate-900 to-slate-800"
                )}>
                    <span className={cn(
                        "text-xs font-bold",
                        days <= 3 ? "text-red-400" : "text-slate-300"
                    )}>{days}d</span>
                    <button
                        onClick={() => { window.location.href = '/#pricing'; }}
                        className={cn(
                            "p-1.5 rounded-full transition-colors",
                            days <= 3
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-[#76D7B6]/20 text-[#76D7B6] hover:bg-[#76D7B6]/30"
                        )}
                        title="Mejorar a Pro"
                    >
                        <CreditCard className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }
    // Trial 30 days logic for progress bar
    const progress = Math.max(0, Math.min(100, (days / 30) * 100));

    return (
        <div className="px-0 pb-4">
            <div className={cn(
                "rounded-xl p-4 text-white shadow-lg transition-transform duration-300 hover:scale-[1.02]",
                days > 0 && days <= 3
                    ? "bg-gradient-to-br from-red-950 to-red-900 border border-red-500/30"
                    : days <= 0 && !isPro
                        ? "bg-slate-900 opacity-80"
                        : "bg-gradient-to-br from-slate-900 to-slate-800"
            )}>
                <div className="mb-2 flex items-center justify-between">
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isPro
                            ? "bg-[#76D7B6]/20 text-[#76D7B6]"
                            : days > 3
                                ? "bg-[#76D7B6]/20 text-[#76D7B6]"
                                : days > 0
                                    ? "bg-red-500/20 text-red-500 animate-pulse"
                                    : "bg-red-500/20 text-red-500"
                    )}>
                        {isPro ? "PLAN PRO" : days > 0 ? "TRIAL ACTIVO" : "TRIAL EXPIRADO"}
                    </span>
                    {!isPro && (
                        <span className={cn(
                            "text-xs font-bold",
                            days <= 3 ? "text-red-400" : "text-slate-400"
                        )}>{days}d</span>
                    )}
                </div>

                <p className="mb-3 text-[11px] text-slate-300 leading-tight">
                    {isPro
                        ? "¡Gracias por ser PRO! Tienes acceso ilimitado a todas las funciones."
                        : days > 0
                            ? days <= 3
                                ? "Tu prueba está por terminar. ¡Actualiza ahora!"
                                : "Tienes acceso total. Actualiza para mantener tus datos."
                            : "Tu prueba ha terminado. Actualiza para seguir usando Livio."}
                </p>

                {!isPro && (
                    <Button
                        onClick={handleUpgrade}
                        className={cn(
                            "w-full rounded-lg py-2 text-xs font-bold transition-colors h-9",
                            days <= 3
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
