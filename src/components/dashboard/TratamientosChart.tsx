"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const TRATAMIENTOS = [
    { name: "Implantes", value: 35, color: "#76D7B6" },
    { name: "Blanqueo", value: 22, color: "#34d399" },
    { name: "Ortodoncia", value: 18, color: "#6ee7b7" },
    { name: "Limpieza", value: 15, color: "#fbbf24" },
    { name: "Endodoncia", value: 10, color: "#f87171" },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
                <p className="font-bold">{payload[0].name}</p>
                <p style={{ color: payload[0].payload.color }}>{payload[0].value}%</p>
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
    if (value < 12) return null;
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
            {value}%
        </text>
    );
};

export function TratamientosChart() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
            <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-800">Top 5 Tratamientos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Por frecuencia este mes</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-44 flex-shrink-0" style={{ width: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={TRATAMIENTOS}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={72}
                                paddingAngle={2}
                                dataKey="value"
                                labelLine={false}
                                label={renderCustomLabel}
                            >
                                {TRATAMIENTOS.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2.5">
                    {TRATAMIENTOS.map((t) => (
                        <div key={t.name} className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-700 truncate">{t.name}</span>
                                    <span className="text-xs font-bold text-slate-500 ml-2">{t.value}%</span>
                                </div>
                                <div className="mt-0.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${t.value}%` }}
                                        transition={{ duration: 0.6, delay: 0.4 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: t.color }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
