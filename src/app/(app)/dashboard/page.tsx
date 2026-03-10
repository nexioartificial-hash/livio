"use client";

import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { 
    Users, 
    Calendar, 
    DollarSign, 
    Clock,
    Activity,
    TrendingDown,
    Loader2
} from "lucide-react";
import { CardKPI } from "@/components/dashboard/CardKPI";
import { TareasWidget } from "@/components/dashboard/TareasWidget";
import { AlertasWidget } from "@/components/dashboard/AlertasWidget";
import { ProximosTurnosWidget } from "@/components/dashboard/ProximosTurnosWidget";
import { ExpiredTrialGuard } from "@/components/dashboard/ExpiredTrialGuard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function DashboardPage() {
    const { user } = useAuth();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        turnosHoy: { total: 0, conf: 0, pend: 0, trend: 0 },
        leads24h: 0,
        noShowRate: 0,
        ingresosHoy: 0,
        ingresosMes: 2450000,
        alertasStock: 0,
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
            const now = DateTime.now();
            const today = now.toISODate();
            const yesterday = now.minus({ days: 1 }).toISODate();
            const last7Days = now.minus({ days: 7 }).toISODate();
            const next30Days = now.plus({ days: 30 }).toISODate();
            const currentTime = now.toFormat('HH:mm');

            try {
                const [
                    turnosHoyRes,
                    turnosAyerRes,
                    turnos7dRes,
                    leads24hRes,
                    tasksRes,
                    alertsRes,
                    tratamientosRes,
                    stockCountRes,
                    inventarioAlertsRes,
                    turnosCanceladosRes
                ] = await Promise.all([
                    // Hoy: solo necesitamos estado y razón para KPIs
                    supabase.from('turno').select('estado, reason, time, patient_name, professional_name').eq('clinic_id', clinicId).eq('date', today),
                    // Ayer: solo el conteo
                    supabase.from('turno').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('date', yesterday),
                    // 7 días: fecha y estado para no-show rate
                    supabase.from('turno').select('date, estado').eq('clinic_id', clinicId).gte('date', last7Days).lte('date', today),
                    // Leads: conteo 24h
                    supabase.from('lead').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', now.minus({ hours: 24 }).toISO()),
                    // Tareas: campos específicos
                    supabase.from('tarea').select('id, titulo, completada, created_at').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(20),
                    // Alertas: campos específicos
                    supabase.from('alerta').select('id, mensaje, tipo, created_at').eq('clinic_id', clinicId).eq('leida', false).order('created_at', { ascending: false }).limit(10),
                    // Precios: para cálculo de ingresos
                    supabase.from('tratamientos').select('nombre, precio_promedio').eq('clinic_id', clinicId).eq('active', true),
                    // Stock crítico: solo conteo
                    supabase.from('stock').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).lte('cantidad', 5),
                    // Inventario alertas: campos específicos
                    supabase.from('inventario').select('producto, stock_actual, stock_min, vencimiento').eq('clinic_id', clinicId).or(`stock_actual.lte.stock_min,vencimiento.lte.${next30Days}`),
                    // Cancelados: campos específicos
                    supabase.from('turno').select('patient_name, time').eq('clinic_id', clinicId).eq('date', today).eq('status', 'cancelado')
                ]);

                const turnosHoyData = turnosHoyRes.data || [];
                
                // KPIs logic
                const tHoyTotal = turnosHoyData.length;
                const tHoyConf = turnosHoyData.filter(t => t.estado === 'confirmado').length;
                const tHoyPend = turnosHoyData.filter(t => t.estado === 'pendiente' || !t.estado).length;
                
                const tAyerCount = turnosAyerRes.count || 0;
                const turnosTrend = tAyerCount === 0 ? 0 : Math.round(((tHoyTotal - tAyerCount) / tAyerCount) * 100);

                const turnos7d = turnos7dRes.data || [];
                const noShowCount = turnos7d.filter(t => t.estado === 'noshow').length;
                const noShowRate = turnos7d.length === 0 ? 0 : Math.round((noShowCount / turnos7d.length) * 100);

                const precioMap = new Map();
                tratamientosRes.data?.forEach(t => precioMap.set(t.nombre, Number(t.precio_promedio)));
                
                const ingresosEstHoy = turnosHoyData.filter((t: any) => t.estado === 'confirmado').reduce((acc: number, t: any) => {
                    const price = precioMap.get(t.reason) || 15000;
                    return acc + price;
                }, 0);

                // Alert logic
                const systemAlerts: any[] = [];
                inventarioAlertsRes.data?.forEach(item => {
                    if (item.stock_actual <= item.stock_min) {
                        systemAlerts.push({
                            id: `stock-${item.producto}`,
                            mensaje: `Stock bajo: ${item.producto} (${item.stock_actual} disp.)`,
                            hora: "Ahora",
                            tipo: "warning"
                        });
                    }
                    if (item.vencimiento && item.vencimiento <= next30Days) {
                        systemAlerts.push({
                            id: `venc-${item.producto}`,
                            mensaje: `Vencimiento próximo: ${item.producto} (${DateTime.fromISO(item.vencimiento).toFormat('dd/MM')})`,
                            hora: "Recordatorio",
                            tipo: "warning"
                        });
                    }
                });

                turnosCanceladosRes.data?.forEach(t => {
                    systemAlerts.push({
                        id: `cancel-${t.patient_name}-${t.time}`,
                        mensaje: `Turno cancelado: ${t.patient_name} (${t.time.substring(0, 5)}hs)`,
                        hora: "Hoy",
                        tipo: "info"
                    });
                });

                const dbAlerts = (alertsRes.data || []).map(a => ({
                    id: a.id,
                    mensaje: a.mensaje,
                    hora: DateTime.fromISO(a.created_at).toFormat('HH:mm'),
                    tipo: a.tipo || 'info'
                }));

                setAlertas([...systemAlerts, ...dbAlerts]);

                // Next appointment selection from today's data (no extra query needed)
                const futureAppointments = turnosHoyData
                    .filter(t => t.time >= currentTime)
                    .sort((a, b) => a.time.localeCompare(b.time));
                
                const nextTurno = futureAppointments[0] || null;

                setStats({
                    turnosHoy: { total: tHoyTotal, conf: tHoyConf, pend: tHoyPend, trend: turnosTrend },
                    leads24h: leads24hRes.count || 0,
                    noShowRate,
                    ingresosHoy: ingresosEstHoy,
                    ingresosMes: 2450000, // Mantener hardcoded como placeholder por ahora
                    alertasStock: stockCountRes.count || 0,
                    proximoTurno: nextTurno
                });

                if (tasksRes.data) setTareas(tasksRes.data);
                
                // Upcoming list (limiting to 5)
                setProximosTurnos(futureAppointments.slice(0, 5).map((t: any) => ({
                    id: t.id,
                    hora: t.time.substring(0, 5),
                    paciente: t.patient_name,
                    profesional: t.professional_name || "Dentista",
                    status: t.estado || 'pendiente'
                })));

            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, supabase]);

    const handleToggleTarea = async (id: string, completed: boolean) => {
        setTareas(prev => prev.map((t: any) => t.id === id ? { ...t, completada: completed } : t));
        await supabase.from('tarea').update({ completada: completed }).eq('id', id);
    };

    const handleAddTarea = async (titulo: string) => {
        const clinicId = (user as any)?.clinic_id;
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
        const clinicId = (user as any)?.clinic_id;
        const { data } = await supabase.from('alerta').insert({
            mensaje,
            tipo,
            clinic_id: clinicId
        }).select().single();
        if (data) setAlertas(prev => [
            { id: data.id, mensaje: data.mensaje, hora: "Reciente", tipo: data.tipo },
            ...prev
        ]);
    };


    return (
        <ExpiredTrialGuard>
            <div className="space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                Buenos días, {user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || "Usuario"} 
                                <span className="text-xl">👋</span>
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

                {/* KPI Grid - Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardKPI
                        title="Turnos Hoy"
                        value={stats.turnosHoy.total}
                        trend={{ value: stats.turnosHoy.trend, label: "vs ayer" }}
                        icon={<Calendar className="h-5 w-5" />}
                        sparkColor="#10B981"
                        delay={0.1}
                        badge={{ label: `${stats.turnosHoy.conf} conf`, color: "green" }}
                        subtitle={`${stats.turnosHoy.pend} pendientes`}
                    />
                    <CardKPI
                        title="Nuevos Leads"
                        value={stats.leads24h}
                        trend={{ value: 24, label: "vs ayer" }}
                        icon={<Users className="h-5 w-5" />}
                        sparkColor="#6366F1"
                        delay={0.2}
                        subtitle="Últimas 24 horas"
                    />
                    <CardKPI
                        title="Ingresos Hoy"
                        value={stats.ingresosHoy.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                        trend={{ value: 12, label: "vs objetivo" }}
                        icon={<DollarSign className="h-5 w-5" />}
                        sparkColor="#10B981"
                        delay={0.3}
                        subtitle="Estimado turnos confirmados"
                    />
                    <CardKPI
                        title="No-Show Rate"
                        value={`${stats.noShowRate}%`}
                        trend={{ value: -2, label: "vs semana pasada" }}
                        icon={<TrendingDown className="h-5 w-5" />}
                        sparkColor="#EF4444"
                        delay={0.4}
                        progress={{ value: stats.noShowRate, max: 15, color: "#EF4444" }}
                        subtitle="Meta: inferior al 15%"
                    />
                </div>

                {/* row 2 & 3 Combined */}
                {/* Standardized Widget Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
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
                    <ProximosTurnosWidget data={proximosTurnos} />
                </div>
            </div>
        </ExpiredTrialGuard>
    );
}
