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
            className="group bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 h-full flex flex-col"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <Clock className="h-4 w-4 text-emerald-500" />
                        </div>
                        Próxima Hora
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium ml-11">
                        Turnos agendados recientemente
                    </p>
                </div>
                <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 space-y-3">
                {data.length > 0 ? (
                    data.map((turno, i) => (
                        <motion.div
                            key={turno.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="relative flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-slate-100 hover:shadow-sm transition-all group/item"
                        >
                            {/* Accent Bar */}
                            <div className={cn(
                                "absolute left-0 top-3 bottom-3 w-1 rounded-full transition-all opacity-0 group-hover/item:opacity-100",
                                turno.status === 'confirmado' ? "bg-emerald-400" : "bg-amber-400"
                            )} />

                            <div className="flex items-center gap-4 pl-1">
                                <div className="flex flex-col items-center justify-center bg-white w-12 h-12 rounded-xl border border-slate-100 shadow-sm group-hover/item:border-emerald-100 transition-colors">
                                    <span className="text-[13px] font-bold text-slate-700">{turno.hora}</span>
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-slate-800 truncate tracking-tight">{turno.paciente}</p>
                                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                        {turno.profesional}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className={cn(
                                    "text-[9px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider",
                                    turno.status === 'confirmado' 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" 
                                        : "bg-amber-50 text-amber-600 border-amber-100/50 text-amber-700"
                                )}>
                                    {turno.status}
                                </span>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="h-6 w-6 text-slate-200" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500 text-balance px-4 leading-relaxed">
                            No hay turnos pendientes en la próxima hora
                        </p>
                    </div>
                )}
            </div>
            
            <Link 
                href="/agenda?view=dia"
                className="mt-4 w-full py-2.5 text-[11px] font-bold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/30 rounded-xl transition-all uppercase tracking-widest text-center block"
            >
                Ver Agenda Completa
            </Link>
        </motion.div>
    );
}
