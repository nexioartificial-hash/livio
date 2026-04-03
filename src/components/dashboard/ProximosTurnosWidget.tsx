"use client";

import { motion } from "framer-motion";
import { Clock, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProximoTurno {
    id: string;
    hora: string;
    paciente: string;
    profesional: string;
    status: string;
}

interface ProximosTurnosWidgetProps {
    data: ProximoTurno[];
}

export function ProximosTurnosWidget({ data }: ProximosTurnosWidgetProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="group bg-gradient-to-b from-white to-slate-100 dark:from-slate-950 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.07)] p-5 flex flex-col h-full"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    Próxima Hora
                </h3>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar flex-1">
                {data.length > 0 ? (
                    data.map((turno, i) => (
                        <motion.div
                            key={turno.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="relative flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-100 dark:border-slate-800 dark:hover:border-slate-700 transition-all group/item"
                        >
                            <div className="flex items-center gap-3 pl-1">
                                <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-950 w-10 h-10 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{turno.hora}</span>
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">{turno.paciente}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                        {turno.profesional}
                                    </p>
                                </div>
                            </div>

                            <span className={cn(
                                "text-[8px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                turno.status === 'confirmado' 
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" 
                                    : "bg-amber-50 text-amber-600 border-amber-100/50"
                            )}>
                                {turno.status}
                            </span>
                        </motion.div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3">
                            <Calendar className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay turnos pendientes</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1 max-w-[140px]">Los próximos turnos programados aparecerán aquí</p>
                    </div>
                )}
            </div>
            
            <Link 
                href="/agenda?view=dia"
                className="mt-4 w-full py-2 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/30 rounded-lg transition-all uppercase tracking-widest text-center block"
            >
                Ver Agenda
            </Link>
        </motion.div>
    );
}
