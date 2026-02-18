"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    UploadCloud,
    FileSpreadsheet,
    Calendar as CalendarIcon,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    UserPlus,
    X
} from "lucide-react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ImportStepProps {
    onNext: () => void;
    onBack: () => void;
}

export default function ImportStep({ onNext, onBack }: ImportStepProps) {
    const [loading, setLoading] = useState(false);
    const [importType, setImportType] = useState<"excel" | "google" | "calendly" | "manual" | null>(null);
    const [stats, setStats] = useState({ patients: 0, appointments: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const { data } = results;
                    console.log("Parsed Data:", data);

                    // Simple mapping simulation
                    // In a real scenario, we would insert into Supabase
                    setStats({ patients: data.length, appointments: Math.floor(data.length * 0.7) });
                    toast.success(`Se detectaron ${data.length} registros`);
                } catch (err) {
                    toast.error("Error al procesar el archivo");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleIntegration = (type: string) => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setStats({ patients: 45, appointments: 120 });
            toast.success(`Conexión con ${type} exitosa`);
        }, 2000);
    };

    const renderImportContent = () => {
        switch (importType) {
            case "excel":
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-[#76D7B6] hover:bg-[#76D7B6]/5 transition-all group"
                        >
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#76D7B6]/10 group-hover:text-[#76D7B6] transition-all">
                                <UploadCloud size={32} />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-slate-700">Haz clic para subir o arrastra tu archivo</p>
                                <p className="text-sm text-slate-400">Soporta Excel (.xlsx) y CSV</p>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.xlsx" />
                        </div>
                    </motion.div>
                );
            case "google":
            case "calendly":
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 space-y-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-400">
                            {importType === "google" ? <CalendarIcon size={40} /> : <CheckCircle2 size={40} />}
                        </div>
                        <p className="text-slate-500 font-medium max-w-xs mx-auto">
                            Conecta tu cuenta para sincronizar automáticamente todos tus turnos y pacientes existentes.
                        </p>
                        <Button onClick={() => handleIntegration(importType)} className="bg-slate-900 text-white rounded-xl h-12 px-8 font-bold">
                            Autorizar {importType.charAt(0).toUpperCase() + importType.slice(1)}
                        </Button>
                    </motion.div>
                );
            case "manual":
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-400">Nombre Paciente</Label>
                            <Input className="h-10 rounded-lg" placeholder="Nombre completo" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-400">DNI / ID</Label>
                            <Input className="h-10 rounded-lg" placeholder="12.345.678" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-400">Teléfono</Label>
                            <Input className="h-10 rounded-lg" placeholder="+54 ..." />
                        </div>
                        <div className="flex items-end flex-shrink-0">
                            <Button variant="outline" className="w-full h-10 rounded-lg font-bold gap-2">
                                <UserPlus size={16} /> Agregar
                            </Button>
                        </div>
                    </motion.div>
                );
            default:
                return (
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: "excel", title: "Excel / CSV", icon: <FileSpreadsheet className="text-green-500" /> },
                            { id: "google", title: "Google Calendar", icon: <CalendarIcon className="text-blue-500" /> },
                            { id: "calendly", title: "Calendly", icon: <CheckCircle2 className="text-indigo-500" /> },
                            { id: "manual", title: "Manual / Rápido", icon: <UserPlus className="text-slate-400" /> },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setImportType(opt.id as any)}
                                className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-[#76D7B6]/30 hover:shadow-xl hover:shadow-[#76D7B6]/5 transition-all text-left flex items-start gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {opt.icon}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{opt.title}</p>
                                    <p className="text-xs text-slate-400 font-medium">Click para configurar</p>
                                </div>
                            </button>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900">Importar Datos</h2>
                    <p className="text-slate-500 font-medium">Trae tu información actual a Livio en segundos.</p>
                </div>
                {importType && (
                    <Button variant="ghost" size="icon" onClick={() => setImportType(null)} className="rounded-full">
                        <X size={20} />
                    </Button>
                )}
            </div>

            <div className="flex-1">
                <AnimatePresence mode="wait">
                    {renderImportContent()}
                </AnimatePresence>
            </div>

            {/* Success Stats */}
            {stats.patients > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-2xl bg-green-50/50 border border-green-100 flex items-center justify-between"
                >
                    <div className="flex gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-black text-green-600">{stats.patients}</p>
                            <p className="text-[10px] font-black text-green-700/50 uppercase">Pacientes</p>
                        </div>
                        <div className="w-[1px] h-8 bg-green-200 mt-2"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-green-600">{stats.appointments}</p>
                            <p className="text-[10px] font-black text-green-700/50 uppercase">Turnos</p>
                        </div>
                    </div>
                    <CheckCircle2 className="text-green-500 w-8 h-8" />
                </motion.div>
            )}

            <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={onBack} className="h-12 px-6 rounded-xl font-bold text-slate-400">
                    <ChevronLeft className="mr-2" /> Volver
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold text-slate-400" onClick={onNext}>
                        Omitir
                    </Button>
                    <Button onClick={onNext} className="h-12 px-10 rounded-xl bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-black shadow-lg shadow-[#76D7B6]/20">
                        Continuar <ChevronRight className="ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
