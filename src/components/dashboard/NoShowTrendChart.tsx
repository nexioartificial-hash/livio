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

interface NoShowTrendData {
    dia: string;
    valor: number;
}

interface NoShowTrendChartProps {
    data?: NoShowTrendData[];
}

const mockData: NoShowTrendData[] = [
    { dia: "Lun", valor: 5 },
    { dia: "Mar", valor: 8 },
    { dia: "Mié", valor: 12 },
    { dia: "Jue", valor: 7 },
    { dia: "Vie", valor: 15 },
    { dia: "Sáb", valor: 10 },
    { dia: "Dom", valor: 4 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
                <p className="font-bold mb-1">{label}</p>
                <p className="text-red-400">
                    No-Show: <span className="font-semibold">{payload[0].value}%</span>
                </p>
            </div>
        );
    }
    return null;
};

export function NoShowTrendChart({ data = mockData }: NoShowTrendChartProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
            <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-800">Trend No-Shows (7d)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Porcentaje de ausentismo semanal</p>
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNoShow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                            dataKey="valor"
                            stroke="#ef4444"
                            strokeWidth={2.5}
                            fill="url(#colorNoShow)"
                            dot={{ fill: "#ef4444", strokeWidth: 0, r: 4 }}
                            activeDot={{ r: 6, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
