"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ReferenceLine
} from "recharts";
import {
    TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Users, DollarSign,
    Calendar, FileText, Download, Bell, UserCheck, Stethoscope, Clock,
    ArrowUpRight, ArrowDownRight, Target, FileBarChart, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Sedes & Periodo ────────────────────────────────────────────────────────
const SEDES = ["Todas", "Centro", "Palermo", "Belgrano"] as const;
type Sede = typeof SEDES[number];
type Periodo = "semanal" | "mensual";

type SedeKpis = { ingresos: string; pacientes: string; noshow: string; ticket: string; noshowOffset: number };
const sedeConfig: Record<Sede, { factor: number; semanal: SedeKpis; mensual: SedeKpis }> = {
    "Todas":    { factor: 1.00, semanal: { ingresos: "$580K",  pacientes: "21", noshow: "6%", ticket: "$27.6K", noshowOffset: 0  }, mensual: { ingresos: "$2.4M",  pacientes: "85", noshow: "6%", ticket: "$28.2K", noshowOffset: 0  } },
    "Centro":   { factor: 0.45, semanal: { ingresos: "$261K",  pacientes: "9",  noshow: "5%", ticket: "$29.0K", noshowOffset: -2 }, mensual: { ingresos: "$1.08M", pacientes: "38", noshow: "5%", ticket: "$28.4K", noshowOffset: -2 } },
    "Palermo":  { factor: 0.35, semanal: { ingresos: "$203K",  pacientes: "7",  noshow: "9%", ticket: "$29.0K", noshowOffset: +3 }, mensual: { ingresos: "$840K",  pacientes: "30", noshow: "9%", ticket: "$28.0K", noshowOffset: +3 } },
    "Belgrano": { factor: 0.20, semanal: { ingresos: "$116K",  pacientes: "4",  noshow: "4%", ticket: "$29.0K", noshowOffset: -3 }, mensual: { ingresos: "$480K",  pacientes: "17", noshow: "4%", ticket: "$28.2K", noshowOffset: -3 } },
};

// ── Mock data ──────────────────────────────────────────────────────────────
const revenueDataBase = [
    { label: "Ene", ingresos: 1200000 }, { label: "Feb", ingresos: 1450000 },
    { label: "Mar", ingresos: 1380000 }, { label: "Abr", ingresos: 1620000 },
    { label: "May", ingresos: 1900000 }, { label: "Jun", ingresos: 2100000 },
    { label: "Jul", ingresos: 1850000 }, { label: "Ago", ingresos: 2400000 },
];

function getCurrentWeekRevenue() {
    const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const dailyBase = [320000, 410000, 380000, 450000, 370000, 290000];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const label = `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
        const isFuture = d > today;
        return { label, ingresos: isFuture ? null : dailyBase[i] };
    });
}
const revenueDataSemanal = getCurrentWeekRevenue();

// Generate Mon–Sat of the current week with mock no-show rates
function getCurrentWeekNoshow() {
    const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const mockRates = [12, 8, 10, 6, 9, 5];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon…
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const label = `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
        const isToday = d.toDateString() === today.toDateString();
        const isFuture = d > today;
        return { label, rate: isFuture ? null : mockRates[i], isToday };
    });
}

const noshowSemanal = getCurrentWeekNoshow();

const MESES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MESES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Mock no-show rate base per month (index 0=Ene)
const noshowByMonth = [18, 16, 14, 13, 11, 10, 12, 9, 8, 7, 8, 6];

// Generate 4–5 weeks within a given month (year, monthIdx 0-based)
function getMonthWeeksNoshow(year: number, monthIdx: number) {
    const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const today = new Date();
    const baseRate = noshowByMonth[monthIdx];
    const result = [];
    const d = new Date(year, monthIdx, 1);
    // Advance to first Monday
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    let weekNum = 0;
    while (d.getMonth() === monthIdx) {
        const label = `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MESES_SHORT[d.getMonth()]}`;
        const isFuture = d > today;
        const rate = isFuture ? null : Math.max(2, baseRate - weekNum * 2 + (weekNum % 2 === 0 ? 1 : -1));
        result.push({ label, rate });
        d.setDate(d.getDate() + 7);
        weekNum++;
    }
    return result;
}

// Mock monthly KPI variation factors (index 0=Ene)
const monthKpiFactors = [0.78, 0.85, 0.90, 0.88, 0.95, 1.05, 0.92, 1.00, 0.97, 1.03, 1.08, 0.82];

const leadsData = [
    { canal: "WhatsApp", leads: 38, convertidos: 14 },
    { canal: "Web", leads: 22, convertidos: 6 },
    { canal: "Instagram", leads: 15, convertidos: 4 },
    { canal: "Referidos", leads: 10, convertidos: 7 },
];

const horariosDataBase = [
    { hora: "8h", lun: 80, mar: 90, mie: 70, jue: 85, vie: 60 },
    { hora: "9h", lun: 95, mar: 100, mie: 95, jue: 90, vie: 80 },
    { hora: "10h", lun: 100, mar: 95, mie: 100, jue: 100, vie: 90 },
    { hora: "11h", lun: 90, mar: 85, mie: 90, jue: 95, vie: 85 },
    { hora: "12h", lun: 60, mar: 55, mie: 65, jue: 60, vie: 50 },
    { hora: "14h", lun: 40, mar: 45, mie: 35, jue: 40, vie: 30 },
    { hora: "15h", lun: 70, mar: 75, mie: 65, jue: 70, vie: 60 },
    { hora: "16h", lun: 85, mar: 90, mie: 80, jue: 85, vie: 75 },
    { hora: "17h", lun: 75, mar: 70, mie: 75, jue: 70, vie: 65 },
    { hora: "18h", lun: 50, mar: 55, mie: 45, jue: 50, vie: 40 },
];

const profesionalesDataBase = [
    { nombre: "Dra. Camila Lotalota", ars: 2100000, turnos: 68, pacientes: 52, hce: 96, sede: "Centro" },
    { nombre: "Dr. Martín Rodríguez", ars: 1750000, turnos: 55, pacientes: 44, hce: 88, sede: "Palermo" },
    { nombre: "Dra. Luciana Fernández", ars: 1400000, turnos: 48, pacientes: 38, hce: 100, sede: "Centro" },
    { nombre: "Dr. Federico López", ars: 980000, turnos: 32, pacientes: 28, hce: 72, sede: "Belgrano" },
];

const treatmentDataBase = [
    { name: "Limpieza", value: 35, ars: 840000 },
    { name: "Ortodoncia", value: 25, ars: 600000 },
    { name: "Endodoncia", value: 15, ars: 360000 },
    { name: "Implantes", value: 12, ars: 288000 },
    { name: "Estética", value: 13, ars: 312000 },
];

const COLORS = ["#76D7B6", "#4ECDC4", "#45B7AA", "#2D9CDB", "#6C63FF"];

const TABS = ["KPIs Críticos", "Rentabilidad", "Profesionales", "Exportar"] as const;
type Tab = typeof TABS[number];

function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ReportesPage() {
    const [tab, setTab] = useState<Tab>("KPIs Críticos");
    const [periodo, setPeriodo] = useState<Periodo>("mensual");
    const [sedeFiltro, setSedeFiltro] = useState<Sede>("Todas");
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth()); // 0-based

    // Derived data filtered/scaled by sede + periodo + mes
    const sedeCfg = sedeConfig[sedeFiltro];
    const mesKpiFactor = periodo === "mensual" ? monthKpiFactors[mesSeleccionado] : 1;
    const cfgBase = sedeCfg[periodo];
    // Apply month variation to mensual KPI values
    const applyMonthFactor = (val: string) => {
        const num = parseFloat(val.replace(/[$KM]/g, ""));
        const unit = val.includes("M") ? "M" : val.includes("K") ? "K" : "";
        const adjusted = +(num * mesKpiFactor).toFixed(1);
        return `$${adjusted}${unit}`;
    };
    const cfg = periodo === "mensual"
        ? { ...cfgBase, ingresos: applyMonthFactor(cfgBase.ingresos), pacientes: String(Math.round(+cfgBase.pacientes * mesKpiFactor)) }
        : cfgBase;
    const sedeScale = sedeFiltro === "Todas" ? 1 : 1.8;

    const revenueData = (periodo === "semanal" ? revenueDataSemanal : revenueDataBase)
        .map(d => ({ ...d, ingresos: d.ingresos !== null ? Math.round((d.ingresos as number) * sedeCfg.factor) : null }));
    const horariosData = horariosDataBase.map(d => ({
        ...d,
        lun: Math.min(100, Math.round(d.lun * sedeCfg.factor * sedeScale)),
        mar: Math.min(100, Math.round(d.mar * sedeCfg.factor * sedeScale)),
        mie: Math.min(100, Math.round(d.mie * sedeCfg.factor * sedeScale)),
        jue: Math.min(100, Math.round(d.jue * sedeCfg.factor * sedeScale)),
        vie: Math.min(100, Math.round(d.vie * sedeCfg.factor * sedeScale)),
    }));
    const profesionalesData = sedeFiltro === "Todas"
        ? profesionalesDataBase
        : profesionalesDataBase.filter(p => p.sede === sedeFiltro);
    const treatmentData = treatmentDataBase.map(d => ({ ...d, ars: Math.round(d.ars * sedeCfg.factor) }));
    const noshowBase = periodo === "semanal"
        ? noshowSemanal
        : getMonthWeeksNoshow(mesSeleccionado <= new Date().getMonth() ? new Date().getFullYear() : new Date().getFullYear() - 1, mesSeleccionado);
    const noshowData = noshowBase.map(d => ({
        ...d,
        rate: d.rate !== null ? Math.max(0, Math.min(30, (d.rate as number) + cfgBase.noshowOffset)) : null,
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Reportes</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Datos actualizados · {periodo === "semanal" ? `Semana del ${revenueDataSemanal[0]?.label ?? ""}` : `${MESES_FULL[mesSeleccionado]} ${new Date().getFullYear()}`}
                    </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <Download className="h-4 w-4" /> Exportar todo
                </Button>
            </div>

            {/* Filtros: Periodo + Mes + Sede */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium shrink-0">Período:</span>
                    <div className="flex rounded-full border border-slate-200 overflow-hidden text-xs font-medium">
                        {(["semanal", "mensual"] as Periodo[]).map((p, i) => (
                            <button
                                key={p}
                                onClick={() => setPeriodo(p)}
                                className={cn(
                                    "px-3 py-1 capitalize transition-colors",
                                    i > 0 && "border-l border-slate-200",
                                    periodo === p
                                        ? "bg-[#76D7B6] text-white border-[#76D7B6]"
                                        : "bg-white text-slate-500 hover:text-[#76D7B6]"
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
                            onChange={e => setMesSeleccionado(+e.target.value)}
                            className="text-xs border border-slate-200 rounded-full px-3 py-1 bg-white text-slate-700 focus:outline-none focus:border-[#76D7B6] cursor-pointer"
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
                        {SEDES.map(s => (
                            <button
                                key={s}
                                onClick={() => setSedeFiltro(s)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                    sedeFiltro === s
                                        ? "bg-[#76D7B6] border-[#76D7B6] text-white"
                                        : "bg-white border-slate-200 text-slate-500 hover:border-[#76D7B6] hover:text-[#76D7B6]"
                                )}
                            >{s}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top KPI bar */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                    { label: periodo === "semanal" ? "Ingresos Sem." : "Ingresos Mes", value: cfg.ingresos, delta: "+14%", up: true, icon: DollarSign },
                    { label: "Pacientes Atendidos", value: cfg.pacientes, delta: "+8%", up: true, icon: Users },
                    { label: "No-Show Rate", value: cfg.noshow, delta: "-40%", up: false, good: true, icon: AlertTriangle },
                    { label: "Ticket Promedio", value: cfg.ticket, delta: "+5%", up: true, icon: TrendingUp },
                ].map(({ label, value, delta, up, good, icon: Icon }) => (
                    <Card key={label}>
                        <CardContent className="p-4 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">{label}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                                <p className={cn("text-xs mt-1 flex items-center gap-0.5",
                                    (good ?? up) ? "text-emerald-600" : "text-red-500"
                                )}>
                                    {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {delta} vs mes ant.
                                </p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-[#76D7B6]/10 flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4 text-[#76D7B6]" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-100">
                {TABS.map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            tab === t
                                ? "border-[#76D7B6] text-[#76D7B6]"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >{t}</button>
                ))}
            </div>

            {/* ── TAB: KPIs Críticos ────────────────────────────────────────── */}
            {tab === "KPIs Críticos" && (
                <div className="space-y-6">
                    {/* No-Show Rate + Producción Top */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        No-Show Rate
                                    </CardTitle>
                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                                        ✓ Dentro de meta (&lt;10%)
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-3 mb-4">
                                    <span className="text-4xl font-black text-slate-900">{cfg.noshow}</span>
                                    <div className="pb-1">
                                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3" /> −40% desde recordatorios activados
                                        </p>
                                        <p className="text-xs text-slate-400">Impacto: $480K recuperados este mes</p>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={140}>
                                    <AreaChart data={noshowData}>
                                        <defs>
                                            <linearGradient id="noshow" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#76D7B6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#76D7B6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                                        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 25]} />
                                        <Tooltip formatter={(v) => [`${v}%`, "No-show"]} />
                                        <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Meta 10%", position: "right", fontSize: 10, fill: "#ef4444" }} />
                                        <Area type="monotone" dataKey="rate" stroke="#76D7B6" fill="url(#noshow)" strokeWidth={2} dot={{ r: 3 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-[#76D7B6]" />
                                    Producción Top Profesional
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {profesionalesData.map((p, i) => (
                                        <div key={p.nombre} className="flex items-center gap-3">
                                            <span className={cn("text-xs font-black w-5 text-center",
                                                i === 0 ? "text-amber-500" : "text-slate-300"
                                            )}>#{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-800 truncate">{p.nombre}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Progress value={(p.ars / 2100000) * 100} className="h-1.5 flex-1" />
                                                    <span className="text-xs font-bold text-slate-700 shrink-0">{fmt(p.ars)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[10px] text-slate-400">{p.turnos} turnos</p>
                                                <p className="text-[10px] text-slate-400">{p.pacientes} pac.</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ocupación boxes */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-purple-500" />
                                    Ocupación por Hora
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {horariosData.map(({ hora, lun, mar, mie, jue, vie }) => {
                                        const avg = Math.round((lun + mar + mie + jue + vie) / 5);
                                        const isBajo = avg < 50;
                                        return (
                                            <div key={hora} className="flex items-center gap-2">
                                                <span className="text-[11px] text-slate-400 w-8 shrink-0">{hora}</span>
                                                <div className="flex-1">
                                                    <Progress value={avg} className={cn("h-2", isBajo && "[&>div]:bg-amber-400")} />
                                                </div>
                                                <span className={cn("text-[11px] font-semibold w-8 text-right shrink-0",
                                                    avg >= 80 ? "text-emerald-600" : isBajo ? "text-amber-500" : "text-slate-600"
                                                )}>{avg}%</span>
                                                {isBajo && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">bajo</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                                    Lunes y viernes 14-15h con baja ocupación — sugerencia: promos flash
                                </p>
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
                                <div className="space-y-2">
                                    {(["lun", "mar", "mie", "jue", "vie"] as const).map((dia) => {
                                        const labels: Record<string, string> = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes" };
                                        const avg = Math.round(horariosData.reduce((acc, h) => acc + h[dia], 0) / horariosData.length);
                                        const isBajo = avg < 50;
                                        return (
                                            <div key={dia} className="flex items-center gap-2">
                                                <span className="text-[11px] text-slate-400 w-16 shrink-0">{labels[dia]}</span>
                                                <div className="flex-1">
                                                    <Progress value={avg} className={cn("h-2", isBajo && "[&>div]:bg-amber-400")} />
                                                </div>
                                                <span className={cn("text-[11px] font-semibold w-8 text-right shrink-0",
                                                    avg >= 80 ? "text-emerald-600" : isBajo ? "text-amber-500" : "text-slate-600"
                                                )}>{avg}%</span>
                                                {isBajo && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">bajo</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                                    Promedio de ocupación a lo largo del día por cada jornada
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── TAB: Rentabilidad ─────────────────────────────────────────── */}
            {tab === "Rentabilidad" && (
                <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Ingresos Mensuales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={revenueData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                                        <Tooltip formatter={(v) => [`$${Number(v).toLocaleString("es-AR")}`, "Ingresos"]} />
                                        <Bar dataKey="ingresos" fill="#76D7B6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Top Tratamientos por Ingresos</CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                        {treatmentData.map(({ name, value, ars }, i) => (
                                            <div key={name} className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                                                <span className="text-xs text-slate-700 flex-1 truncate">{name}</span>
                                                <span className="text-xs font-semibold text-slate-800">{value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabla rentabilidad */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Target className="h-4 w-4 text-[#76D7B6]" />
                                Métricas de Rentabilidad — Marzo 2026
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Métrica</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Valor</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Fórmula / Ejemplo</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {[
                                            {
                                                metrica: "Ingresos netos", valor: "$2.4M",
                                                formula: "85 turnos × $28.2K avg",
                                                accion: "Ajustar precios implantes (+15%)",
                                                ok: true,
                                            },
                                            {
                                                metrica: "Top tratamiento", valor: "Limpieza 35%",
                                                formula: "$840K · 30 sesiones/mes",
                                                accion: "Promocionar ortodoncia via chatbot",
                                                ok: true,
                                            },
                                            {
                                                metrica: "Costo por paciente", valor: "18%",
                                                formula: "$432K gastos / 85 pac.",
                                                accion: "✓ Dentro de meta &lt;20%",
                                                ok: true,
                                            },
                                            {
                                                metrica: "ROI no-shows", valor: "×11.2",
                                                formula: "(24 rec. × $20K) - $43K Livio",
                                                accion: "Activar recordatorios WhatsApp",
                                                ok: true,
                                            },
                                            {
                                                metrica: "Tasa conversión leads", valor: "36%",
                                                formula: "31 nuevos / 85 leads",
                                                accion: "Meta superada — mantener canal WhatsApp",
                                                ok: true,
                                            },
                                        ].map(({ metrica, valor, formula, accion, ok }) => (
                                            <tr key={metrica} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-800 text-xs">{metrica}</td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("text-xs font-bold", ok ? "text-emerald-600" : "text-red-500")}>{valor}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: formula }} />
                                                <td className="px-4 py-3 text-xs text-slate-600">{accion}</td>
                                            </tr>
                                        ))}
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
                    {/* Ranking */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-[#76D7B6]" />
                                Ranking Producción — Marzo 2026
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        {["#", "Profesional", "Facturado", "Turnos", "Pacientes", "HCE firmadas", "Estado"].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {profesionalesData.map((p, i) => (
                                        <tr key={p.nombre} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3">
                                                <span className={cn("text-sm font-black", i === 0 ? "text-amber-500" : "text-slate-300")}>#{i + 1}</span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800 text-xs">{p.nombre}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-900">{fmt(p.ars)}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{p.turnos}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{p.pacientes}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={p.hce} className="h-1.5 w-16" />
                                                    <span className={cn("text-xs font-semibold", p.hce >= 90 ? "text-emerald-600" : "text-amber-500")}>{p.hce}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.hce >= 90
                                                    ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Cumple Ley 27.706</Badge>
                                                    : <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Pendiente auditoría</Badge>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={horariosData} barSize={18}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 110]} />
                                    <Tooltip formatter={(v) => [`${v}%`, "Ocupación"]} />
                                    <Bar dataKey="lun" name="Lun" fill="#76D7B6" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="vie" name="Vie" fill="#CBD5E1" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {[
                                    { hora: "Lun 14-15h", ocu: "40%", sugerencia: "Promo flash: 20% off limpieza" },
                                    { hora: "Vie 14-15h", ocu: "30%", sugerencia: "Pack fin de semana extendido" },
                                    { hora: "Lun 12h", ocu: "60%", sugerencia: "Turno almuerzo express (30 min)" },
                                ].map(({ hora, ocu, sugerencia }) => (
                                    <div key={hora} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-700">{hora} · {ocu} ocupación</p>
                                            <p className="text-[11px] text-amber-600 mt-0.5">{sugerencia}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                        <div className="w-9 h-9 rounded-full bg-[#76D7B6]/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon className="h-4 w-4 text-[#76D7B6]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{titulo}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                            <div className="flex gap-2 mt-2">
                                                {formats.map(f => (
                                                    <Button key={f} variant="outline" size="sm" className="h-7 text-xs gap-1.5">
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
                                <Bell className="h-4 w-4 text-[#76D7B6]" />
                                Alertas Automáticas por Email
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { alerta: "No-shows superaron el 10%", estado: "Activa", mensaje: '"No-shows subieron 15%, agenda 5 turnos extras."', color: "emerald" },
                                    { alerta: "Producción semanal baja vs meta", estado: "Activa", mensaje: '"Esta semana $320K bajo meta. Top tratamiento: limpieza."', color: "emerald" },
                                    { alerta: "Lead sin seguimiento +48h", estado: "Activa", mensaje: '"3 leads sin respuesta. Seguimiento recomendado."', color: "emerald" },
                                    { alerta: "HCE sin firmar +7 días", estado: "Inactiva", mensaje: '"Dr. López tiene 4 historias pendientes."', color: "slate" },
                                ].map(({ alerta, estado, mensaje, color }) => (
                                    <div key={alerta} className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
                                        <div className="flex items-start gap-3">
                                            <Bell className={cn("h-4 w-4 mt-0.5 shrink-0", color === "emerald" ? "text-emerald-500" : "text-slate-300")} />
                                            <div>
                                                <p className="text-xs font-semibold text-slate-800">{alerta}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5 italic">{mensaje}</p>
                                            </div>
                                        </div>
                                        <Badge className={cn("shrink-0 text-[10px] border-0",
                                            color === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
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

