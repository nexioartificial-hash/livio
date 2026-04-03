"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, ReferenceLine
} from "recharts";
import {
    TrendingDown, TrendingUp, AlertTriangle, Users, DollarSign,
    Calendar, Download, Bell, UserCheck, Stethoscope, Clock,
    ArrowUpRight, ArrowDownRight, Target, FileBarChart, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getReporteData, type ReporteData, type ReportePeriodo } from "@/app/actions/reportes";

// ── Constantes ──────────────────────────────────────────────────────────────
const MESES_FULL = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const COLORS = ["#76D7B6", "#4ECDC4", "#45B7AA", "#2D9CDB", "#6C63FF"];

const TABS = ["KPIs Críticos", "Rentabilidad", "Profesionales", "Exportar"] as const;
type Tab = typeof TABS[number];

// ── Formatters ──────────────────────────────────────────────────────────────
const fmtARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
    initialData: ReporteData;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ReportesClient({ initialData }: Props) {
    const [tab, setTab] = useState<Tab>("KPIs Críticos");
    const [periodo, setPeriodo] = useState<ReportePeriodo>("mensual");
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
    const [anioSeleccionado] = useState(new Date().getFullYear());
    const [sucursalFiltro, setSucursalFiltro] = useState("Todas");
    const [data, setData] = useState<ReporteData>(initialData);
    const [isPending, startTransition] = useTransition();

    const sucursales = ["Todas", ...data.sucursales];

    function refetch(
        newPeriodo: ReportePeriodo,
        newMes: number,
        newSucursal: string
    ) {
        startTransition(async () => {
            try {
                const result = await getReporteData(newPeriodo, newMes, anioSeleccionado, newSucursal);
                setData(result);
            } catch {
                toast.error("Error al cargar los datos");
            }
        });
    }

    function handlePeriodo(p: ReportePeriodo) {
        setPeriodo(p);
        refetch(p, mesSeleccionado, sucursalFiltro);
    }

    function handleMes(mes: number) {
        setMesSeleccionado(mes);
        refetch(periodo, mes, sucursalFiltro);
    }

    function handleSucursal(s: string) {
        setSucursalFiltro(s);
        refetch(periodo, mesSeleccionado, s);
    }

    // Datos derivados para charts
    // No-show chart: porcentaje de no-shows por dia
    const noshowData = data.turnosPorDia.map(d => ({
        label: d.fecha.substring(5), // MM-DD
        rate: d.total > 0 ? Math.round((d.noshow / d.total) * 100) : 0,
    }));

    // Revenue chart: confirmados por dia como proxy de ingresos
    const revenueData = data.turnosPorDia.map(d => ({
        label: d.fecha.substring(5),
        confirmados: d.confirmados,
    }));

    // Horas chart: datos de turnosPorHora
    const horariosData = data.turnosPorHora.map(h => ({
        hora: h.hora,
        lun: h.lun,
        mar: h.mar,
        mie: h.mie,
        jue: h.jue,
        vie: h.vie,
    }));

    // Pie chart: tratamientos
    const totalTratamientos = data.tratamientos.reduce((s, t) => s + t.cantidad, 0);
    const treatmentData = data.tratamientos.slice(0, 5).map(t => ({
        name: t.nombre,
        value: totalTratamientos > 0 ? Math.round((t.cantidad / totalTratamientos) * 100) : 0,
        ars: t.ingresos,
    }));

    // Top profesional para reference en progress bars
    const maxFacturado = data.profesionales[0]?.facturado ?? 1;

    // HCE % por profesional
    const profesionalesConHce = data.profesionales.map(p => ({
        ...p,
        hcePct: p.hceTotal > 0 ? Math.round((p.hceCompletadas / p.hceTotal) * 100) : 0,
    }));

    return (
        <div className="space-y-6 relative">
            {/* Overlay de carga */}
            {isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reportes</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Datos actualizados · {periodo === "mensual"
                            ? `${MESES_FULL[mesSeleccionado]} ${anioSeleccionado}`
                            : "Semana actual"}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => toast.info("Próximamente")}
                >
                    <Download className="h-4 w-4" /> Exportar todo
                </Button>
            </div>

            {/* Filtros: Periodo + Mes + Sucursal */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium shrink-0">Período:</span>
                    <div className="flex rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
                        {(["semanal", "mensual"] as ReportePeriodo[]).map((p, i) => (
                            <button
                                key={p}
                                onClick={() => handlePeriodo(p)}
                                className={cn(
                                    "px-3 py-1 capitalize transition-colors",
                                    i > 0 && "border-l border-slate-200 dark:border-slate-700",
                                    periodo === p
                                        ? "bg-accent text-white border-accent"
                                        : "bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-accent"
                                )}
                            >{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                        ))}
                    </div>
                </div>

                {periodo === "mensual" && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium shrink-0">Mes:</span>
                        <select
                            value={mesSeleccionado}
                            onChange={e => handleMes(+e.target.value)}
                            className="text-xs border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-accent cursor-pointer"
                        >
                            {MESES_FULL.map((m, i) => (
                                <option key={m} value={i}>{m}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium shrink-0">Sede:</span>
                    <div className="flex gap-1.5 flex-wrap">
                        {sucursales.map(s => (
                            <button
                                key={s}
                                onClick={() => handleSucursal(s)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                    sucursalFiltro === s
                                        ? "bg-accent border-accent text-white"
                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-accent hover:text-accent"
                                )}
                            >{s}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top KPI bar */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                    {
                        label: periodo === "semanal" ? "Ingresos Sem." : "Ingresos Mes",
                        value: fmtARS.format(data.kpis.ingresos),
                        icon: DollarSign,
                        up: true,
                    },
                    {
                        label: "Pacientes Atendidos",
                        value: String(data.kpis.pacientes),
                        icon: Users,
                        up: true,
                    },
                    {
                        label: "No-Show Rate",
                        value: `${data.kpis.noShowRate}%`,
                        icon: AlertTriangle,
                        up: false,
                        good: true,
                    },
                    {
                        label: "Ticket Promedio",
                        value: fmtARS.format(data.kpis.ticketPromedio),
                        icon: TrendingUp,
                        up: true,
                    },
                ].map(({ label, value, icon: Icon, up, good }) => (
                    <Card key={label}>
                        <CardContent className="p-4 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                                <p className={cn("text-xs mt-1 flex items-center gap-0.5",
                                    (good ?? up) ? "text-emerald-600" : "text-red-500"
                                )}>
                                    {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    Datos reales
                                </p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4 text-accent" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800">
                {TABS.map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            tab === t
                                ? "border-accent text-accent"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
                        )}
                    >{t}</button>
                ))}
            </div>

            {/* ── TAB: KPIs Críticos ────────────────────────────────────────── */}
            {tab === "KPIs Críticos" && (
                <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* No-Show Rate chart */}
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        No-Show Rate
                                    </CardTitle>
                                    <Badge className={cn(
                                        "border-0 text-[10px]",
                                        data.kpis.noShowRate <= 10
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-red-100 text-red-700"
                                    )}>
                                        {data.kpis.noShowRate <= 10 ? "✓ Dentro de meta (<10%)" : "⚠ Supera meta (>10%)"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-3 mb-4">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                                        {data.kpis.noShowRate}%
                                    </span>
                                    <div className="pb-1">
                                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3" /> Datos del período seleccionado
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {noshows(data)} turnos perdidos en el período
                                        </p>
                                    </div>
                                </div>
                                {noshowData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={140}>
                                        <AreaChart data={noshowData}>
                                            <defs>
                                                <linearGradient id="noshow" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#76D7B6" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#76D7B6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 25]} />
                                            <Tooltip formatter={(v) => [`${v}%`, "No-show"]} />
                                            <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Meta 10%", position: "right", fontSize: 10, fill: "#ef4444" }} />
                                            <Area type="monotone" dataKey="rate" stroke="#76D7B6" fill="url(#noshow)" strokeWidth={2} dot={{ r: 3 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[140px] flex items-center justify-center text-sm text-slate-400">
                                        Sin datos para el período
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top profesionales */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-accent" />
                                    Producción Top Profesional
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.profesionales.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">Sin datos de profesionales</p>
                                ) : (
                                    <div className="space-y-3">
                                        {data.profesionales.slice(0, 4).map((p, i) => (
                                            <div key={p.nombre} className="flex items-center gap-3">
                                                <span className={cn("text-xs font-black w-5 text-center",
                                                    i === 0 ? "text-amber-500" : "text-slate-300"
                                                )}>#{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{p.nombre}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Progress value={maxFacturado > 0 ? (p.facturado / maxFacturado) * 100 : 0} className="h-1.5 flex-1" />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">{fmt(p.facturado)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] text-slate-400">{p.turnos} turnos</p>
                                                    <p className="text-[10px] text-slate-400">{p.pacientes} pac.</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ocupación por Hora y por Día */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-purple-500" />
                                    Ocupación por Hora
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {horariosData.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">Sin datos de horarios</p>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            {horariosData.map(({ hora, lun, mar, mie, jue, vie }) => {
                                                const avg = Math.round((lun + mar + mie + jue + vie) / 5);
                                                const maxInRow = Math.max(lun, mar, mie, jue, vie, 1);
                                                const pct = Math.round((avg / maxInRow) * 100);
                                                const isBajo = pct < 50;
                                                return (
                                                    <div key={hora} className="flex items-center gap-2">
                                                        <span className="text-[11px] text-slate-400 w-10 shrink-0">{hora}</span>
                                                        <div className="flex-1">
                                                            <Progress value={pct} className={cn("h-2", isBajo && "[&>div]:bg-amber-400")} />
                                                        </div>
                                                        <span className={cn("text-[11px] font-semibold w-8 text-right shrink-0",
                                                            pct >= 80 ? "text-emerald-600" : isBajo ? "text-amber-500" : "text-slate-600 dark:text-slate-400"
                                                        )}>{avg}</span>
                                                        {isBajo && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">bajo</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                                            Promedio de turnos por hora (Lun–Vie)
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-purple-500" />
                                    Ocupación por Día
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {horariosData.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">Sin datos de días</p>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            {(["lun", "mar", "mie", "jue", "vie"] as const).map((dia) => {
                                                const labels: Record<string, string> = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes" };
                                                const total = horariosData.reduce((acc, h) => acc + h[dia], 0);
                                                const maxDia = Math.max(...(["lun", "mar", "mie", "jue", "vie"] as const).map(
                                                    d => horariosData.reduce((acc, h) => acc + h[d], 0)
                                                ), 1);
                                                const pct = Math.round((total / maxDia) * 100);
                                                const isBajo = pct < 50;
                                                return (
                                                    <div key={dia} className="flex items-center gap-2">
                                                        <span className="text-[11px] text-slate-400 w-16 shrink-0">{labels[dia]}</span>
                                                        <div className="flex-1">
                                                            <Progress value={pct} className={cn("h-2", isBajo && "[&>div]:bg-amber-400")} />
                                                        </div>
                                                        <span className={cn("text-[11px] font-semibold w-8 text-right shrink-0",
                                                            pct >= 80 ? "text-emerald-600" : isBajo ? "text-amber-500" : "text-slate-600 dark:text-slate-400"
                                                        )}>{pct}%</span>
                                                        {isBajo && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">bajo</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                                            Promedio de ocupación a lo largo del día por cada jornada
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── TAB: Rentabilidad ─────────────────────────────────────────── */}
            {tab === "Rentabilidad" && (
                <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Revenue bar chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">
                                    {periodo === "mensual" ? "Turnos Confirmados por Día" : "Turnos Confirmados esta Semana"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {revenueData.length === 0 ? (
                                    <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
                                        Sin datos para el período
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={revenueData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip formatter={(v) => [v, "Confirmados"]} />
                                            <Bar dataKey="confirmados" fill="#76D7B6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pie chart tratamientos */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Top Tratamientos por Ingresos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {treatmentData.length === 0 ? (
                                    <div className="h-[180px] flex items-center justify-center text-sm text-slate-400">
                                        Sin datos de tratamientos
                                    </div>
                                ) : (
                                    <div className="flex gap-4 items-center">
                                        <ResponsiveContainer width="50%" height={180}>
                                            <PieChart>
                                                <Pie data={treatmentData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                                                    {treatmentData.map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v, n, p) => [`${v}% · ${fmt(p.payload.ars)}`, p.payload.name]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex-1 space-y-2">
                                            {treatmentData.map(({ name, value }, i) => (
                                                <div key={name} className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                                                    <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{name}</span>
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{value}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabla rentabilidad con datos reales */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Target className="h-4 w-4 text-accent" />
                                Métricas de Rentabilidad — {MESES_FULL[mesSeleccionado]} {anioSeleccionado}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Métrica</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Valor</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 text-xs">Ingresos netos</td>
                                            <td className="px-4 py-3"><span className="text-xs font-bold text-emerald-600">{fmtARS.format(data.kpis.ingresos)}</span></td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                                {data.kpis.pacientes} pacientes × {fmtARS.format(data.kpis.ticketPromedio)} ticket prom.
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 text-xs">Ticket promedio</td>
                                            <td className="px-4 py-3"><span className="text-xs font-bold text-emerald-600">{fmtARS.format(data.kpis.ticketPromedio)}</span></td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">Por paciente atendido</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 text-xs">Top tratamiento</td>
                                            <td className="px-4 py-3"><span className="text-xs font-bold text-emerald-600">{data.tratamientos[0]?.nombre ?? "—"}</span></td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                                {data.tratamientos[0] ? `${data.tratamientos[0].cantidad} sesiones · ${fmtARS.format(data.tratamientos[0].ingresos)}` : "Sin datos"}
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 text-xs">No-Show Rate</td>
                                            <td className="px-4 py-3">
                                                <span className={cn("text-xs font-bold", data.kpis.noShowRate <= 10 ? "text-emerald-600" : "text-red-500")}>
                                                    {data.kpis.noShowRate}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                                {data.kpis.noShowRate <= 10 ? "Dentro de meta (<10%)" : "Supera meta — revisar recordatorios"}
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 text-xs">Profesionales activos</td>
                                            <td className="px-4 py-3"><span className="text-xs font-bold text-emerald-600">{data.profesionales.filter(p => p.turnos > 0).length}</span></td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">Con al menos 1 turno en el período</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── TAB: Profesionales ───────────────────────────────────────── */}
            {tab === "Profesionales" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-accent" />
                                Ranking Producción — {MESES_FULL[mesSeleccionado]} {anioSeleccionado}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {profesionalesConHce.length === 0 ? (
                                <p className="text-sm text-slate-400 py-6 text-center">Sin datos de profesionales para el período</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                            {["#", "Profesional", "Facturado", "Turnos", "Pacientes", "HCE firmadas", "Estado"].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {profesionalesConHce.map((p, i) => (
                                            <tr key={p.nombre} className="hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50">
                                                <td className="px-4 py-3">
                                                    <span className={cn("text-sm font-black", i === 0 ? "text-amber-500" : "text-slate-300")}>#{i + 1}</span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 text-xs">{p.nombre}</td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white">{fmt(p.facturado)}</td>
                                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{p.turnos}</td>
                                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{p.pacientes}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={p.hcePct} className="h-1.5 w-16" />
                                                        <span className={cn("text-xs font-semibold", p.hcePct >= 90 ? "text-emerald-600" : "text-amber-500")}>{p.hcePct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {p.hcePct >= 90
                                                        ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Cumple Ley 27.706</Badge>
                                                        : <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Pendiente auditoría</Badge>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cuellos de botella */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-500" />
                                Cuellos de Botella — Horarios con Baja Ocupación
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {horariosData.length === 0 ? (
                                <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
                                    Sin datos de horarios
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={horariosData} barSize={18}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip formatter={(v) => [v, "Turnos"]} />
                                            <Bar dataKey="lun" name="Lun" fill="#76D7B6" radius={[2, 2, 0, 0]} />
                                            <Bar dataKey="vie" name="Vie" fill="#CBD5E1" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                                        Comparativa Lunes vs Viernes por franja horaria
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── TAB: Exportar ────────────────────────────────────────────── */}
            {tab === "Exportar" && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            { titulo: "Reporte Mensual Completo", desc: "KPIs, rentabilidad y ranking profesionales con logo de la clínica.", icon: FileBarChart, formats: ["PDF", "CSV"] },
                            { titulo: "Reporte de No-Shows", desc: "Detalle de turnos perdidos, impacto económico y tendencias.", icon: AlertTriangle, formats: ["PDF", "CSV"] },
                            { titulo: "Producción por Profesional", desc: "Facturación, turnos y cumplimiento HCE filtrado por mes.", icon: Stethoscope, formats: ["PDF", "CSV"] },
                            { titulo: "Leads y Conversiones", desc: "Canal origen, tasas y comparativa mensual.", icon: UserCheck, formats: ["CSV"] },
                        ].map(({ titulo, desc, icon: Icon, formats }) => (
                            <Card key={titulo}>
                                <CardContent className="p-4 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon className="h-4 w-4 text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{titulo}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                            <div className="flex gap-2 mt-2">
                                                {formats.map(f => (
                                                    <Button
                                                        key={f}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1.5"
                                                        onClick={() => toast.info("Próximamente")}
                                                    >
                                                        <Download className="h-3 w-3" /> {f}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Alertas automáticas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Bell className="h-4 w-4 text-accent" />
                                Alertas Automáticas por Email
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { alerta: "No-shows superaron el 10%", estado: "Activa", mensaje: '"No-shows subieron, agenda turnos extras."', color: "emerald" },
                                    { alerta: "Producción semanal baja vs meta", estado: "Activa", mensaje: '"Esta semana bajo meta. Revisá el ranking de profesionales."', color: "emerald" },
                                    { alerta: "Lead sin seguimiento +48h", estado: "Activa", mensaje: '"Leads sin respuesta. Seguimiento recomendado."', color: "emerald" },
                                    { alerta: "HCE sin firmar +7 días", estado: "Inactiva", mensaje: '"Historias clínicas pendientes de firma."', color: "slate" },
                                ].map(({ alerta, estado, mensaje, color }) => (
                                    <div key={alerta} className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
                                        <div className="flex items-start gap-3">
                                            <Bell className={cn("h-4 w-4 mt-0.5 shrink-0", color === "emerald" ? "text-emerald-500" : "text-slate-300")} />
                                            <div>
                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{alerta}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5 italic">{mensaje}</p>
                                            </div>
                                        </div>
                                        <Badge className={cn("shrink-0 text-[10px] border-0",
                                            color === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                        )}>{estado}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

// Helper: total de no-shows en el período
function noshows(data: ReporteData) {
    return data.turnosPorDia.reduce((s, d) => s + d.noshow, 0);
}
