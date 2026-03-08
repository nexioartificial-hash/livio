"use client";

import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { 
    Users, 
    Calendar, 
    DollarSign, 
    ArrowUpRight, 
    TrendingUp, 
    Clock,
    Plus,
    Activity
} from "lucide-react";
import { CardKPI } from "@/components/dashboard/CardKPI";
import { TareasWidget } from "@/components/dashboard/TareasWidget";
import { AlertasWidget } from "@/components/dashboard/AlertasWidget";
import { TurnosSemanalChart } from "@/components/dashboard/TurnosSemanalChart";
import { TratamientosChart } from "@/components/dashboard/TratamientosChart";
import { ProximosTurnosWidget } from "@/components/dashboard/ProximosTurnosWidget";
import { ExpiredTrialGuard } from "@/components/dashboard/ExpiredTrialGuard";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const { user } = useAuth();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pacientesHoy: 0,
        turnosHoy: 0,
        ingresosMes: 0,
        proximoTurno: null as any
    });
    const [tareas, setTareas] = useState<any[]>([]);
    const [alertas, setAlertas] = useState<any[]>([]);
    const [proximosTurnos, setProximosTurnos] = useState<any[]>([]);

    useEffect(() => {
        const clinicId = (user as any)?.clinic_id;
        if (!clinicId) return;

        const fetchData = async () => {
            setLoading(true);
            const today = DateTime.now().toISODate();

            try {
                // 1. Fetch data in parallel
                const [patientsRes, turnosRes, nextRes, tasksRes, alertsRes, listRes] = await Promise.all([
                    supabase.from('paciente').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
                    supabase.from('turno').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('date', today),
                    supabase.from('turno').select('*').eq('clinic_id', clinicId).eq('date', today).gte('time', DateTime.now().toFormat('HH:mm')).order('time').limit(1).maybeSingle(),
                    supabase.from('tareas').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(20),
                    supabase.from('alertas').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(10),
                    supabase.from('turno').select('*').eq('clinic_id', clinicId).eq('date', today).gte('time', DateTime.now().toFormat('HH:mm')).order('time').limit(5)
                ]);

                setStats({
                    pacientesHoy: patientsRes.count || 0,
                    turnosHoy: turnosRes.count || 0,
                    ingresosMes: 2450000, 
                    proximoTurno: nextRes.data
                });

                if (tasksRes.data) setTareas(tasksRes.data);
                if (alertsRes.data) setAlertas(alertsRes.data);
                if (listRes.data) {
                    setProximosTurnos(listRes.data.map(t => ({
                        id: t.id,
                        hora: t.time.substring(0, 5),
                        paciente: t.patient_name,
                        profesional: "Dentista", // Fallback
                        status: t.estado || 'confirmado'
                    })));
                }

            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, supabase]);

    const handleToggleTarea = async (id: string, completed: boolean) => {
        setTareas(prev => prev.map(t => t.id === id ? { ...t, completada: completed } : t));
        await supabase.from('tareas').update({ completada: completed }).eq('id', id);
    };

    const handleAddTarea = async (titulo: string) => {
        const clinicId = (user as any)?.clinic_id;
        const { data } = await supabase.from('tareas').insert({
            titulo,
            clinic_id: clinicId,
            completada: false,
            fecha: DateTime.now().toLocaleString(DateTime.DATE_SHORT)
        }).select().single();
        if (data) setTareas(prev => [data, ...prev]);
    };

    const handleDismissAlerta = async (id: string) => {
        setAlertas(prev => prev.filter(a => a.id !== id));
        await supabase.from('alertas').delete().eq('id', id);
    };

    const handleAddAlerta = async (mensaje: string, tipo: string) => {
        const clinicId = (user as any)?.clinic_id;
        const { data } = await supabase.from('alertas').insert({
            mensaje,
            tipo,
            clinic_id: clinicId,
            hora: DateTime.now().toFormat('HH:mm')
        }).select().single();
        if (data) setAlertas(prev => [data, ...prev]);
    };

    return (
        <ExpiredTrialGuard>
            <div className="space-y-8 animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panel Principal</h1>
                        <p className="text-slate-500 mt-1">Bienvenido de nuevo. Así está tu clínica hoy.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="gap-2 shadow-sm bg-white">
                            <Activity className="h-4 w-4 text-emerald-500" /> Ver tiempo real
                        </Button>
                        <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold gap-2 shadow-sm border-b-2 border-emerald-600 active:border-b-0 transition-all">
                            <Plus className="h-4 w-4" /> Nuevo Turno
                        </Button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardKPI
                        title="Turnos Hoy"
                        value={stats.turnosHoy}
                        trend={{ value: 12, label: "vs ayer" }}
                        icon={<Calendar className="h-5 w-5" />}
                        sparkColor="#76D7B6"
                        delay={0.1}
                    />
                    <CardKPI
                        title="Pacientes"
                        value={stats.pacientesHoy}
                        trend={{ value: 5, label: "este mes" }}
                        icon={<Users className="h-5 w-5" />}
                        sparkColor="#6C63FF"
                        delay={0.2}
                    />
                    <CardKPI
                        title="Ingresos Mes"
                        value={`$${(stats.ingresosMes / 1000000).toFixed(1)}M`}
                        trend={{ value: 18, label: "objetivo" }}
                        icon={<DollarSign className="h-5 w-5" />}
                        sparkColor="#10B981"
                        delay={0.3}
                    />
                    <CardKPI
                        title="Próximo Turno"
                        value={stats.proximoTurno?.time?.substring(0, 5) || "--:--"}
                        subtitle={stats.proximoTurno?.patient_name || "Sin turnos"}
                        icon={<Clock className="h-5 w-5" />}
                        sparkColor="#F59E0B"
                        delay={0.4}
                    />
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left & Middle Columns */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Weekly Chart */}
                        <TurnosSemanalChart />
                        
                        {/* Interactive Widgets */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TareasWidget 
                                tareas={tareas} 
                                onToggle={handleToggleTarea} 
                                onAdd={handleAddTarea} 
                            />
                            <AlertasWidget 
                                alertas={alertas} 
                                onDismiss={handleDismissAlerta}
                                onAdd={handleAddAlerta}
                            />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        <ProximosTurnosWidget data={proximosTurnos} />
                        <TratamientosChart />
                    </div>
                </div>
            </div>
        </ExpiredTrialGuard>
    );
}
