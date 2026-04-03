"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimeSlot {
    start: string;
    end: string;
}

interface DayConfig {
    enabled: boolean;
    slots: TimeSlot[];
}

interface Horarios {
    [key: string]: DayConfig;
}

const DAYS = [
    { id: "monday", label: "L" },
    { id: "tuesday", label: "M" },
    { id: "wednesday", label: "X" },
    { id: "thursday", label: "J" },
    { id: "friday", label: "V" },
    { id: "saturday", label: "S" },
];

export function MiniCalendar({ horarios }: { horarios: Horarios }) {
    if (!horarios) return <div className="text-[10px] text-slate-400">Sin horarios</div>;

    return (
        <TooltipProvider>
            <div className="flex gap-1">
                {DAYS.map((day) => {
                    const config = horarios[day.id];
                    const active = config?.enabled && config?.slots?.length > 0;

                    return (
                        <Tooltip key={day.id}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        "h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all",
                                        active
                                            ? "bg-accent text-white shadow-sm"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-300"
                                    )}
                                >
                                    {day.label}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-2 text-[11px]">
                                <p className="font-bold mb-1 uppercase text-accent">
                                    {day.id}
                                </p>
                                {active ? (
                                    config.slots.map((slot, idx) => (
                                        <p key={idx} className="text-slate-200">
                                            {slot.start} - {slot.end}
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-slate-400 italic">No disponible</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}
