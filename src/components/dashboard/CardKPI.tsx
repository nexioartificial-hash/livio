"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkData {
    value: number;
}

interface CardKPIProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { value: number; label: string };
    badge?: { label: string; color: "red" | "green" | "orange" | "blue" };
    progress?: { value: number; max: number; color?: string };
    sparkData?: SparkData[];
    sparkColor?: string;
    icon?: ReactNode;
    className?: string;
    onClick?: () => void;
    delay?: number;
}

export function CardKPI({
    title,
    value,
    subtitle,
    trend,
    badge,
    progress,
    sparkData,
    sparkColor = "#76D7B6",
    icon,
    className,
    onClick,
    delay = 0,
}: CardKPIProps) {
    const badgeColors = {
        red: "bg-red-50 text-red-600 border border-red-100",
        green: "bg-emerald-50 text-emerald-600 border border-emerald-100",
        orange: "bg-orange-50 text-orange-600 border border-orange-100",
        blue: "bg-blue-50 text-blue-600 border border-blue-100",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay, ease: "easeOut" }}
            onClick={onClick}
            className={cn(
                "relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 overflow-hidden",
                onClick && "cursor-pointer hover:shadow-md hover:border-slate-200 transition-all duration-200 group",
                className
            )}
        >
            {/* Decorative accent */}
            <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-8 translate-x-8"
                style={{ backgroundColor: sparkColor }}
            />

            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{title}</p>

                    <div className="flex items-end gap-2 flex-wrap">
                        <span className="text-2xl font-bold text-slate-900 leading-none">{value}</span>
                        {trend && (
                            <span className={cn(
                                "flex items-center gap-0.5 text-xs font-semibold mb-0.5",
                                trend.value >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                                {trend.value >= 0
                                    ? <TrendingUp className="h-3 w-3" />
                                    : <TrendingDown className="h-3 w-3" />
                                }
                                {Math.abs(trend.value)}% {trend.label}
                            </span>
                        )}
                    </div>

                    {subtitle && (
                        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                    )}
                </div>

                <div className="flex flex-col items-end gap-2 ml-2 flex-shrink-0">
                    {icon && (
                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${sparkColor}15` }}>
                            <div style={{ color: sparkColor }}>{icon}</div>
                        </div>
                    )}
                    {badge && (
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", badgeColors[badge.color])}>
                            {badge.label}
                        </span>
                    )}
                </div>
            </div>

            {/* Sparkline */}
            {sparkData && sparkData.length > 0 && (
                <div className="h-10 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={sparkColor}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={true}
                            />
                            <Tooltip
                                contentStyle={{
                                    fontSize: "11px",
                                    background: "#1e293b",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: "#fff",
                                    padding: "4px 8px",
                                }}
                                itemStyle={{ color: sparkColor }}
                                labelFormatter={() => ""}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Progress bar */}
            {progress && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>Progreso</span>
                        <span>{Math.round((progress.value / progress.max) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((progress.value / progress.max) * 100, 100)}%` }}
                            transition={{ duration: 0.6, delay: delay + 0.2, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: progress.color || sparkColor }}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
}
