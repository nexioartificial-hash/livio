"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Plus, Calendar as CalendarIcon, FileSpreadsheet, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- TYPES & CONSTANTS ---
type Month = 0 | 1 | 2; // Enero, Febrero, Marzo

const MONTH_NAMES = ["Enero", "Febrero", "Marzo"];
const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface Event {
    id: number;
    time: string;
    patient: string;
    type: "primary" | "warning" | "success";
}

const MOCK_EVENTS: Record<number, Event[]> = {
    17: [
        { id: 1, time: "09:00", patient: "Sofía", type: "success" },
        { id: 2, time: "10:00", patient: "Carlos", type: "warning" },
    ],
    18: [
        { id: 3, time: "09:30", patient: "Lucía", type: "success" },
        { id: 4, time: "15:00", patient: "Juan", type: "warning" },
    ],
    19: [
        { id: 5, time: "10:00", patient: "María", type: "success" },
    ],
};

export default function AnimatedCalendar() {
    const [month, setMonth] = useState<Month>(1); // 1 = Febrero
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parallax Effect for Header (now more subtle)
    const { scrollY } = useScroll();
    const headerY = useTransform(scrollY, [0, 200], [0, -10]);

    // Handle Month Navigation
    const nextMonth = () => setMonth(m => (m < 2 ? m + 1 : m) as Month);
    const prevMonth = () => setMonth(m => (m > 0 ? m - 1 : m) as Month);

    // Click outside to deselect
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setSelectedDay(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.02,
                delayChildren: 0.1,
            }
        }
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: -8 },
        show: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 120 }
        }
    };

    const getDaysInMonth = (m: Month) => {
        if (m === 1) return 28; // Feb 2026
        return 31; // Jan and Mar
    };

    const daysCount = getDaysInMonth(month);
    const days = Array.from({ length: daysCount }, (_, i) => i + 1);

    return (
        <div ref={containerRef} className="space-y-6 w-full mx-auto select-none">
            {/* --- TOP BAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-900">Agenda</h1>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-slate-200 text-slate-600 font-bold gap-2 h-10 px-4 hover:bg-slate-50 transition-all shadow-sm">
                                <Download className="h-4 w-4" /> Importar <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px] p-2 shadow-xl border-slate-100">
                            <DropdownMenuItem className="py-2.5 cursor-pointer gap-3 font-medium text-slate-600 hover:text-blue-500 hover:bg-blue-50 transition-colors" onClick={() => window.location.href = '/config/importar?source=google'}>
                                <CalendarIcon className="h-4 w-4 text-blue-500" /> Google Calendar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer gap-3 font-medium text-slate-600 hover:text-green-500 hover:bg-green-50 transition-colors" onClick={() => window.location.href = '/config/importar?source=excel'}>
                                <FileSpreadsheet className="h-4 w-4 text-green-500" /> Excel / CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-2.5 cursor-pointer gap-3 font-medium text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 transition-colors" onClick={() => window.location.href = '/config/importar?source=calendly'}>
                                <CalendarIcon className="h-4 w-4 text-indigo-500" /> Calendly
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold gap-2 h-10 px-6 shadow-sm hover:shadow-md transition-all">
                        <Plus className="h-4 w-4" /> Nuevo Turno
                    </Button>
                </div>
            </div>

            {/* --- CALENDAR NAVIGATION & FILTERS --- */}
            <div className="flex flex-col lg:flex-row justify-between items-center bg-white border border-slate-100 rounded-xl p-3 gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:text-slate-900 transition-colors px-2 py-1 rounded-lg">
                        <option>Todos los Profesionales</option>
                        <option>Dr. Juan Pérez</option>
                        <option>Dra. María López</option>
                    </select>
                    <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer hover:text-slate-900 transition-colors px-2 py-1 rounded-lg">
                        <option>Todas las Sedes</option>
                        <option>Sede Central</option>
                        <option>Sede Palermo</option>
                    </select>
                </div>

                <motion.div style={{ y: headerY }} className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={prevMonth}
                        className="text-slate-300 hover:text-[#76D7B6] transition-colors p-1"
                    >
                        <ChevronLeft className="h-6 w-6 stroke-[3px]" />
                    </motion.button>

                    <div className="w-40 text-center overflow-hidden h-8 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={month}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-lg font-bold text-slate-900 tracking-tight"
                            >
                                {MONTH_NAMES[month]} 2026
                            </motion.h2>
                        </AnimatePresence>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={nextMonth}
                        className="text-slate-300 hover:text-[#76D7B6] transition-colors p-1"
                    >
                        <ChevronRight className="h-6 w-6 stroke-[3px]" />
                    </motion.button>
                </motion.div>

                <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    {["Día", "Semana", "Mes"].map(view => (
                        <button key={view} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${view === "Mes" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"}`}>
                            {view}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- CALENDAR GRID --- */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {/* Days of week header */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                    {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{day}</div>
                    ))}
                </div>

                {/* Grid cells with stagger animation */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={month}
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-7"
                    >
                        {days.map(day => {
                            const events = MOCK_EVENTS[day] || [];
                            const isSelected = selectedDay === day;

                            return (
                                <motion.div
                                    key={`${month}-${day}`}
                                    variants={itemVariants}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDay(day);
                                    }}
                                    className={`relative min-h-[100px] border-r border-b border-slate-100 p-2 transition-colors cursor-pointer group flex flex-col gap-1 ${isSelected ? "bg-[#76D7B6]/5" : "hover:bg-slate-50/50"
                                        }`}
                                >
                                    <span className={`text-xs font-bold transition-all ${isSelected ? "text-[#76D7B6] font-black" : "text-slate-400 group-hover:text-slate-900"
                                        }`}>
                                        {day}
                                    </span>

                                    <div className="flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                                        {events.map(event => (
                                            <div
                                                key={event.id}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate transition-all ${event.type === "success"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                    }`}
                                            >
                                                {event.time} {event.patient}
                                            </div>
                                        ))}
                                        {day === 17 && <div className="text-[9px] text-slate-400 font-bold ml-1">+{events.length > 2 ? events.length - 2 : 2} más</div>}
                                    </div>

                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="absolute inset-0 border-2 border-[#76D7B6] pointer-events-none z-10"
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* Tooltip on Selection */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl z-50 flex items-center gap-2"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#76D7B6]" />
                                                Evento del día {day}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* --- LEGENDArea --- */}
            <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2 opacity-60">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span>Confirmado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <span>Pendiente</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Horario: 8:00 - 20:00
                </div>
            </div>
        </div>
    );
}
