"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { Users, Calendar, DollarSign, TrendingDown, Activity } from "lucide-react";
import { CardKPI } from "@/components/dashboard/CardKPI";
import { TareasWidget } from "@/components/dashboard/TareasWidget";
import { AlertasWidget } from "@/components/dashboard/AlertasWidget";
import { ProximosTurnosWidget } from "@/components/dashboard/ProximosTurnosWidget";
import { ExpiredTrialGuard } from "@/components/dashboard/ExpiredTrialGuard";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface DashboardClientProps {
    userName: string;
    clinicId: string;
    initialStats: {
        turnosHoy: { total: number; conf: number; pend: number; trend: number };
        leads24h: number;
        noShowRate: number;
        ingresosHoy: number;
    };
    initialTareas: any[];
    initialAlertas: any[];
    initialProximosTurnos: any[];
}

export function DashboardClient({
    userName,
    clinicId,
    initialStats,
    initialTareas,
    initialAlertas,
    initialProximosTurnos,
}: DashboardClientProps) {
    const supabase = createClient();
    const [tareas, setTareas] = useState<any[]>(initialTareas);
    const [alertas, setAlertas] = useState<any[]>(initialAlertas);

    const handleToggleTarea = async (id: string, completed: boolean) => {
        setTareas(prev => prev.map((t: any) => t.id === id ? { ...t, completada: completed } : t));
        await supabase.from('tarea').update({ completada: completed }).eq('id', id);
    };

    const handleAddTarea = async (titulo: string) => {
        const { data } = await supabase.from('tarea').insert({
            titulo,
            clinic_id: clinicId,
            completada: false
        }).select().single();
        if (data) setTareas(prev => [data, ...prev]);
    };

    const handleDismissAlerta = async (id: string) => {
        if (id.length > 30) {
            await supabase.from('alerta').update({ leida: true }).eq('id', id);
        }
        setAlertas(prev => prev.filter((a: any) => a.id !== id));
    };

    const handleAddAlerta = async (mensaje: string, tipo: string) => {
        const { data } = await supabase.from('alerta').insert({
            mensaje, tipo, clinic_id: clinicId
        }).select().single();
        if (data) setAlertas(prev => [
            { id: data.id, mensaje: data.mensaje, hora: "Reciente", tipo: data.tipo },
            ...prev
        ]);
    };

    return (
        <ExpiredTrialGuard>
            <div className="space-y-8 animate-in fade-in duration-300 max-w-[1600px] mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                Buenos días, {userName} <span className="text-xl">👋</span>
                            </h1>
                            <p className="text-slate-400 font-medium text-xs mt-0.5">
                                Última actualización: {DateTime.now().toFormat('hh:mm a')}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-[#76D7B6] hover:bg-slate-50 transition-all active:rotate-180 duration-500"
                            onClick={() => window.location.reload()}
                        >
                            <Activity className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardKPI
                        title="Turnos Hoy"
                        value={initialStats.turnosHoy.total}
                        trend={{ value: initialStats.turnosHoy.trend, label: "vs ayer" }}
                        icon={<Calendar className="h-5 w-5" />}
                        sparkColor="#10B981"
                        delay={0}
                        badge={{ label: `${initialStats.turnosHoy.conf} conf`, color: "green" }}
                        subtitle={`${initialStats.turnosHoy.pend} pendientes`}
                    />
                    <CardKPI
                        title="Nuevos Leads"
                        value={initialStats.leads24h}
                        trend={{ value: 24, label: "vs ayer" }}
                        icon={<Users className="h-5 w-5" />}
                        sparkColor="#6366F1"
                        delay={0}
                        subtitle="Últimas 24 horas"
                    />
                    <CardKPI
                        title="Ingresos Hoy"
                        value={initialStats.ingresosHoy.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                        trend={{ value: 12, label: "vs objetivo" }}
                        icon={<DollarSign className="h-5 w-5" />}
                        sparkColor="#10B981"
                        delay={0}
                        subtitle="Estimado turnos confirmados"
                    />
                    <CardKPI
                        title="No-Show Rate"
                        value={`${initialStats.noShowRate}%`}
                        trend={{ value: -2, label: "vs semana pasada" }}
                        icon={<TrendingDown className="h-5 w-5" />}
                        sparkColor="#EF4444"
                        delay={0}
                        progress={{ value: initialStats.noShowRate, max: 15, color: "#EF4444" }}
                        subtitle="Meta: inferior al 15%"
                    />
                </div>

                {/* Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    <TareasWidget tareas={tareas} onToggle={handleToggleTarea} onAdd={handleAddTarea} />
                    <AlertasWidget alertas={alertas} onDismiss={handleDismissAlerta} onAdd={handleAddAlerta} />
                    <ProximosTurnosWidget data={initialProximosTurnos} />
                </div>
            </div>
        </ExpiredTrialGuard>
    );
}
