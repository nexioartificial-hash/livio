"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Clock, Download, Calendar, FileSpreadsheet, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data
const professionals = [
    { id: "all", name: "Todos" },
    { id: "1", name: "Dr. Juan Pérez" },
    { id: "2", name: "Dra. María López" },
    { id: "3", name: "Dr. Carlos García" },
];

const branches = [
    { id: "all", name: "Todas" },
    { id: "1", name: "Sede Central" },
    { id: "2", name: "Sede Palermo" },
];

const hours = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`);

interface Appointment {
    id: number;
    patient: string;
    professional: string;
    time: string;
    duration: number; // minutes
    reason: string;
    status: "pendiente" | "confirmado" | "cancelado";
    day: number; // day of month
}

const mockAppointments: Appointment[] = [
    { id: 1, patient: "Sofia Martinez", professional: "Dr. Juan Pérez", time: "09:00", duration: 30, reason: "Limpieza", status: "confirmado", day: 17 },
    { id: 2, patient: "Carlos Ruiz", professional: "Dr. Juan Pérez", time: "10:00", duration: 60, reason: "Endodoncia", status: "pendiente", day: 17 },
    { id: 3, patient: "Ana García", professional: "Dra. María López", time: "11:00", duration: 30, reason: "Control", status: "confirmado", day: 17 },
    { id: 4, patient: "Pedro López", professional: "Dr. Carlos García", time: "14:00", duration: 45, reason: "Ortodoncia", status: "pendiente", day: 17 },
    { id: 5, patient: "Lucía Fernández", professional: "Dra. María López", time: "09:30", duration: 30, reason: "Consulta", status: "confirmado", day: 18 },
    { id: 6, patient: "Juan Martínez", professional: "Dr. Juan Pérez", time: "15:00", duration: 60, reason: "Implante", status: "pendiente", day: 18 },
    { id: 7, patient: "María Torres", professional: "Dr. Carlos García", time: "10:00", duration: 30, reason: "Limpieza", status: "confirmado", day: 19 },
];

type ViewMode = "dia" | "semana" | "mes";

export default function AgendaPage() {
    const [view, setView] = useState<ViewMode>("semana");
    const [selectedProfessional, setSelectedProfessional] = useState("all");
    const [selectedBranch, setSelectedBranch] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDate] = useState(new Date(2026, 1, 17)); // Feb 17, 2026

    const weekDays = ["Lun 16", "Mar 17", "Mié 18", "Jue 19", "Vie 20", "Sáb 21"];
    const today = 17;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmado": return "bg-green-100 border-l-green-500 text-green-800";
            case "pendiente": return "bg-yellow-50 border-l-yellow-500 text-yellow-800";
            case "cancelado": return "bg-red-50 border-l-red-400 text-red-700";
            default: return "bg-slate-50 border-l-slate-300";
        }
    };

    const filteredAppointments = mockAppointments.filter(a => {
        if (selectedProfessional !== "all" && a.professional !== professionals.find(p => p.id === selectedProfessional)?.name) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold text-slate-900">Agenda</h1>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-slate-200 text-slate-600 font-bold gap-2 h-10 px-4">
                                <Download className="h-4 w-4" /> Importar <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] p-2 shadow-xl border-slate-100">
                            <DropdownMenuItem className="py-3 cursor-pointer gap-3" onClick={() => window.location.href = '/config/importar?source=google'}>
                                <Calendar className="h-4 w-4 text-blue-500" /> Google Calendar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-3 cursor-pointer gap-3" onClick={() => window.location.href = '/config/importar?source=excel'}>
                                <FileSpreadsheet className="h-4 w-4 text-green-500" /> Excel / CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-3 cursor-pointer gap-3" onClick={() => window.location.href = '/config/importar?source=calendly'}>
                                <Calendar className="h-4 w-4 text-indigo-500" /> Calendly
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold gap-2 h-10 px-6 shadow-sm hover:shadow-md transition-all" onClick={() => setIsModalOpen(true)}>
                        <Plus className="h-4 w-4" /> Nuevo Turno
                    </Button>
                </div>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                    <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Profesional" />
                        </SelectTrigger>
                        <SelectContent>
                            {professionals.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="font-medium text-sm text-slate-700 min-w-[140px] text-center">Febrero 2026</span>
                    <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>

                    <div className="flex ml-4 bg-slate-100 rounded-lg p-0.5">
                        {(["dia", "semana", "mes"] as ViewMode[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Calendar Grid - Week View */}
            {view === "semana" && (
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px]">
                                {/* Day Headers */}
                                <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b bg-slate-50">
                                    <div className="p-3 text-xs font-medium text-slate-500 border-r">Hora</div>
                                    {weekDays.map((day, i) => (
                                        <div key={day} className={`p-3 text-center text-xs font-medium border-r last:border-r-0 ${i === 1 ? "bg-[#76D7B6]/5 text-[#76D7B6] font-bold" : "text-slate-600"}`}>
                                            {day}
                                            {i === 1 && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#76D7B6] mx-auto"></div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Time Rows */}
                                {hours.map(hour => (
                                    <div key={hour} className="grid grid-cols-[80px_repeat(6,1fr)] border-b last:border-b-0 min-h-[60px]">
                                        <div className="p-2 text-xs text-slate-400 border-r flex items-start justify-end pr-3 pt-1">{hour}</div>
                                        {weekDays.map((_, dayIdx) => {
                                            const dayNum = 16 + dayIdx;
                                            const dayAppts = filteredAppointments.filter(a => a.day === dayNum && a.time === hour);
                                            return (
                                                <div key={dayIdx} className={`border-r last:border-r-0 p-1 ${dayIdx === 1 ? "bg-[#76D7B6]/[0.02]" : ""}`}>
                                                    {dayAppts.map(appt => (
                                                        <div key={appt.id} className={`rounded-md border-l-[3px] p-2 text-xs cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(appt.status)}`}>
                                                            <p className="font-semibold truncate">{appt.patient}</p>
                                                            <p className="text-[10px] opacity-70 flex items-center gap-1 mt-0.5">
                                                                <Clock className="h-2.5 w-2.5" /> {appt.time} · {appt.duration}min
                                                            </p>
                                                            <p className="text-[10px] opacity-60 truncate">{appt.professional}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Day View */}
            {view === "dia" && (
                <Card>
                    <CardContent className="p-0">
                        <div className="border-b bg-slate-50 p-3 text-center">
                            <span className="text-sm font-bold text-[#76D7B6]">Martes 17 de Febrero</span>
                        </div>
                        {hours.map(hour => {
                            const appts = filteredAppointments.filter(a => a.day === today && a.time === hour);
                            return (
                                <div key={hour} className="flex border-b last:border-b-0 min-h-[56px]">
                                    <div className="w-20 p-2 text-xs text-slate-400 border-r flex items-start justify-end pr-3 pt-2 flex-shrink-0">{hour}</div>
                                    <div className="flex-1 p-1.5">
                                        {appts.map(appt => (
                                            <div key={appt.id} className={`rounded-lg border-l-[3px] p-3 cursor-pointer hover:shadow-md transition ${getStatusColor(appt.status)}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-sm">{appt.patient}</span>
                                                    <Badge variant="secondary" className="text-[10px]">{appt.status}</Badge>
                                                </div>
                                                <p className="text-xs opacity-70 mt-1">{appt.reason} · {appt.professional} · {appt.duration}min</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Month View */}
            {view === "mes" && (
                <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-7 gap-1">
                            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
                                <div key={d} className="p-2 text-center text-xs font-medium text-slate-500">{d}</div>
                            ))}
                            {Array.from({ length: 28 }, (_, i) => {
                                const dayNum = i + 1;
                                const dayAppts = filteredAppointments.filter(a => a.day === dayNum);
                                const isToday = dayNum === today;
                                return (
                                    <div key={i} className={`rounded-lg p-2 min-h-[80px] text-xs border ${isToday ? "bg-[#76D7B6]/5 border-[#76D7B6]" : "border-transparent hover:bg-slate-50"}`}>
                                        <span className={`font-medium ${isToday ? "text-[#76D7B6] font-bold" : "text-slate-600"}`}>{dayNum}</span>
                                        <div className="mt-1 space-y-0.5">
                                            {dayAppts.slice(0, 2).map(a => (
                                                <div key={a.id} className={`rounded px-1.5 py-0.5 text-[10px] truncate ${a.status === "confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                    {a.time} {a.patient.split(" ")[0]}
                                                </div>
                                            ))}
                                            {dayAppts.length > 2 && <span className="text-[10px] text-slate-400">+{dayAppts.length - 2} más</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* New Appointment Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Nuevo Turno</DialogTitle>
                        <DialogDescription>Completá los datos para agendar un nuevo turno.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Paciente</Label>
                            <Input className="col-span-3" placeholder="Buscar paciente..." />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Profesional</Label>
                            <Select>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                    {professionals.filter(p => p.id !== "all").map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Fecha</Label>
                            <Input className="col-span-3" type="date" defaultValue="2026-02-17" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Hora</Label>
                            <Input className="col-span-3" type="time" defaultValue="09:00" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Duración</Label>
                            <Select defaultValue="30">
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15 minutos</SelectItem>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="45">45 minutos</SelectItem>
                                    <SelectItem value="60">60 minutos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Motivo</Label>
                            <Input className="col-span-3" placeholder="Ej: Limpieza, Control, Ortodoncia..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold" onClick={() => setIsModalOpen(false)}>
                            Agendar Turno
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
