"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const TRATAMIENTOS = [
    { name: "Implantes", value: 45, color: "#10B981" },
    { name: "Ortodoncia", value: 30, color: "#3B82F6" },
    { name: "Blanqueamiento", value: 25, color: "#F59E0B" },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-slate-800">
                <p className="font-bold">{payload[0].name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
                    <p className="font-medium" style={{ color: payload[0].payload.color }}>{payload[0].value}% frecuencia</p>
                </div>
            </div>
        );
    }
    return null;
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (value < 5) return null;
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={900}>
            {value}%
        </text>
    );
};

export function TratamientosChart() {
    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full"
        >
            <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Top 3 Tratamientos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Demanda actual por volumen</p>
            </div>

            <div className="flex items-center gap-6 flex-1">
                <div className="h-40 w-40 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={TRATAMIENTOS}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={78}
                                paddingAngle={4}
                                dataKey="value"
                                labelLine={false}
                                label={renderCustomLabel}
                                stroke="none"
                            >
                                {TRATAMIENTOS.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-4">
                    {TRATAMIENTOS.map((t) => (
                        <div key={t.name} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600 truncate">{t.name}</span>
                                <span className="text-xs font-black text-slate-400">{t.value}%</span>
                            </div>
                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${t.value}%` }}
                                    transition={{ duration: 0.8, delay: 0.5 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: t.color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
