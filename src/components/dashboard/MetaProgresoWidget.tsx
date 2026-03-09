"use client";

import { motion } from "framer-motion";
import { Target, TrendingUp } from "lucide-react";

interface MetaProgresoWidgetProps {
    current: number;
    target: number;
    delay?: number;
}

export function MetaProgresoWidget({ current, target, delay = 0 }: MetaProgresoWidgetProps) {
    const percentage = Math.round((current / target) * 100);
    const remaining = target - current;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full flex flex-col justify-between"
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Meta del Mes</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Facturacion vs objetivo</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Target className="h-5 w-5 text-emerald-500" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900">
                        ${(current / 1000000).toFixed(1)}M
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                        objetivo ${(target / 1000000).toFixed(0)}M
                    </span>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-emerald-500">{percentage}% logrado</span>
                        <span className="text-slate-400">{100 - percentage}% restante</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            transition={{ duration: 1, ease: "circOut", delay: delay + 0.3 }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full relative"
                        >
                            <div className="absolute top-0 right-0 h-full w-4 bg-white/20 skew-x-12 translate-x-1 duration-1000 animate-pulse" />
                        </motion.div>
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1 text-emerald-500">
                        <TrendingUp className="h-3 w-3" />
                        <span>+12.5%</span>
                    </div>
                    <span>vs mes anterior</span>
                </div>
            </div>
        </motion.div>
    );
}
