"use client";

import { motion } from "framer-motion";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";

interface TurnosData {
    dia: string;
    confirmados: number;
    pendientes: number;
    noShow: number;
}

interface TurnosSemanalChartProps {
    data?: TurnosData[];
    filterLabel?: string;
}

const mockData: TurnosData[] = [
    { dia: "Lun", confirmados: 22, pendientes: 5, noShow: 3 },
    { dia: "Mar", confirmados: 28, pendientes: 4, noShow: 2 },
    { dia: "Mié", confirmados: 25, pendientes: 6, noShow: 4 },
    { dia: "Jue", confirmados: 31, pendientes: 3, noShow: 2 },
    { dia: "Vie", confirmados: 29, pendientes: 7, noShow: 5 },
    { dia: "Sáb", confirmados: 18, pendientes: 2, noShow: 1 },
    { dia: "Dom", confirmados: 8,  pendientes: 1, noShow: 0 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
                <p className="font-bold mb-1">{label}</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }}>
                        {p.name}: <span className="font-semibold">{p.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function TurnosSemanalChart({ data = mockData, filterLabel = "Esta semana" }: TurnosSemanalChartProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-gradient-to-b from-white to-slate-100 dark:from-slate-950 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.07)] p-6"
        >
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Turnos Semanales</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">{filterLabel}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                        Confirmados
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        Pendientes
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        No-Show
                    </span>
                </div>
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                            <linearGradient id="colorConfirmados" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#76D7B6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#76D7B6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="dia"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="confirmados"
                            name="Confirmados"
                            stroke="#76D7B6"
                            strokeWidth={2.5}
                            fill="url(#colorConfirmados)"
                            dot={{ fill: "#76D7B6", strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5, fill: "#76D7B6" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="pendientes"
                            name="Pendientes"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray="5 3"
                        />
                        <Line
                            type="monotone"
                            dataKey="noShow"
                            name="No-Show"
                            stroke="#f87171"
                            strokeWidth={2}
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
