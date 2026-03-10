"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, MapPin, Loader2, Save, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const DAYS_ES = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo"
} as const;

const DEFAULT_HORARIOS = {
    monday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    tuesday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    wednesday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    thursday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    friday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    saturday: { enabled: false, slots: [{ start: "09:00", end: "13:00" }] },
    sunday: { enabled: false, slots: [{ start: "09:00", end: "13:00" }] },
};

interface HorariosModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicId: string;
    initialSedes?: any[];
}

export default function HorariosModal({ isOpen, onClose, clinicId, initialSedes }: HorariosModalProps) {
    const [horarios, setHorarios] = useState(DEFAULT_HORARIOS);
    const [sedes, setSedes] = useState<any[]>([]);
    const [selectedSedes, setSelectedSedes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening to avoid stale data
            setHorarios(DEFAULT_HORARIOS);
            setSedes([]);
            setSelectedSedes([]);
            setSaving(false);

            if (initialSedes && initialSedes.length > 0) {
                console.log("HorariosModal: Using initialSedes from props", initialSedes.length);
                setSedes(initialSedes);
                setSelectedSedes(initialSedes.map(s => s.id));
                setLoading(false);
            } else if (clinicId) {
                fetchSedes();
            } else {
                setLoading(false);
                setSedes([]);
            }
        } else {
            // Clean up when closing
            setLoading(false);
        }
    }, [isOpen, clinicId]);

    const fetchSedes = async () => {
        if (!clinicId) {
            console.warn("fetchSedes: No clinicId provided");
            setLoading(false);
            return;
        }

        const supabase = createClient();
        setLoading(true);
        console.log("fetchSedes: Starting fetch for clinicId:", clinicId);

        // Add a safety timeout
        const timeoutId = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn("fetchSedes: Operation timed out");
                    toast.error("La carga de sedes está tardando más de lo esperado.");
                }
                return false;
            });
        }, 10000);

        try {
            const { data, error } = await supabase
                .from("sucursal")
                .select("id, name")
                .eq("clinic_id", clinicId)
                .order("name");

            if (error) {
                console.error("fetchSedes: Supabase error:", error);
                throw error;
            }

            console.log("fetchSedes: Successfully fetched", data?.length || 0, "sedes");
            setSedes(data || []);
            // By default select all
            setSelectedSedes(data?.map(s => s.id) || []);
        } catch (error) {
            console.error("fetchSedes: Caught error:", error);
            toast.error("Error al cargar las sedes");
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (selectedSedes.length === 0) {
            toast.error("Seleccione al menos una sede");
            return;
        }

        const supabase = createClient();
        setSaving(true);
        
        // Add a safety timeout
        const timeoutId = setTimeout(() => {
            if (saving) {
                console.warn("Save operation timed out");
                setSaving(false);
                toast.error("La operación está tardando más de lo esperado. Por favor, reintenta.");
            }
        }, 10000);

        try {
            console.log("Saving horarios for sedes:", selectedSedes);
            const { error } = await supabase
                .from("sucursal")
                .update({ horarios })
                .in("id", selectedSedes);

            if (error) {
                console.error("Supabase update error:", error);
                throw error;
            }

            console.log("Horarios saved successfully");
            toast.success("Horarios aplicados correctamente");
            setSaving(false); 
            onClose();
        } catch (error) {
            console.error("Error saving horarios:", error);
            toast.error("Error al guardar los horarios. Verifique su conexión.");
        } finally {
            clearTimeout(timeoutId);
            setSaving(false);
        }
    };

    const updateDay = (day: keyof typeof DAYS_ES, updates: any) => {
        setHorarios(prev => ({
            ...prev,
            [day]: { ...prev[day], ...updates }
        }));
    };

    const updateSlot = (day: keyof typeof DAYS_ES, index: number, updates: any) => {
        const newSlots = [...horarios[day].slots];
        newSlots[index] = { ...newSlots[index], ...updates };
        updateDay(day, { slots: newSlots });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] w-[95vw] max-h-[90vh] overflow-hidden p-0 border-none bg-slate-50 shadow-xl rounded-[24px]">
                {/* Fixed Top Header */}
                <div className="bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                    <div className="space-y-0">
                        <DialogTitle className="text-xl font-semibold text-slate-900 tracking-tight">
                            Horarios de Atención
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-[12px] tracking-tight">
                            Configura la disponibilidad semanal y sincroniza los cambios con tus sedes de forma centralizada.
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={onClose} 
                            disabled={saving} 
                            className="text-slate-500 hover:text-slate-700 font-medium px-5 h-10 rounded-xl transition-colors text-sm"
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-medium px-6 h-10 rounded-xl shadow-md shadow-[#76D7B6]/10 transition-all hover:scale-[1.02] active:scale-98 flex items-center gap-2 text-sm"
                            onClick={handleSave}
                            disabled={saving || loading || selectedSedes.length === 0}
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {saving ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </div>
                </div>

                <div className="pt-2 px-8 pb-8 overflow-y-auto max-h-[calc(90vh-70px)] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Horarios List - Col 7 */}
                        <div className="md:col-span-7 space-y-1 lg:space-y-2">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-base font-semibold text-slate-900 tracking-tight">Configuración Semanal</h4>
                            </div>
                            
                            <div className="bg-white rounded-[16px] border border-slate-100 divide-y divide-slate-50 shadow-sm overflow-hidden">
                                {(Object.keys(DAYS_ES) as Array<keyof typeof DAYS_ES>).map((day) => (
                                    <div key={day} className={cn(
                                        "group flex items-center justify-between p-2.5 px-4 transition-all duration-300",
                                        horarios[day].enabled ? "bg-white" : "bg-slate-50/40"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <Switch
                                                checked={horarios[day].enabled}
                                                onCheckedChange={(enabled) => updateDay(day, { enabled })}
                                                className="data-[state=checked]:bg-[#76D7B6] scale-90"
                                            />
                                            <span className={cn(
                                                "font-semibold text-sm tracking-tight w-20 lg:w-24 capitalize transition-colors",
                                                horarios[day].enabled ? "text-slate-900" : "text-slate-400"
                                            )}>
                                                {DAYS_ES[day]}
                                            </span>
                                        </div>

                                        {horarios[day].enabled ? (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="relative group/input">
                                                    <input
                                                        type="time"
                                                        value={horarios[day].slots[0].start}
                                                        onChange={(e) => updateSlot(day, 0, { start: e.target.value })}
                                                        className="text-[13px] font-medium bg-slate-100/50 border border-slate-100/60 rounded-lg px-3 py-1.5 focus:ring-4 focus:ring-[#76D7B6]/10 transition-all outline-none text-slate-700 pr-8 hover:bg-slate-100 hover:border-slate-200"
                                                    />
                                                    <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none group-hover/input:text-[#76D7B6] transition-colors" />
                                                </div>
                                                <span className="text-slate-300 text-xs font-medium lowercase">a</span>
                                                <div className="relative group/input">
                                                    <input
                                                        type="time"
                                                        value={horarios[day].slots[0].end}
                                                        onChange={(e) => updateSlot(day, 0, { end: e.target.value })}
                                                        className="text-[13px] font-medium bg-slate-100/50 border border-slate-100/60 rounded-lg px-3 py-1.5 focus:ring-4 focus:ring-[#76D7B6]/10 transition-all outline-none text-slate-700 pr-8 hover:bg-slate-100 hover:border-slate-200"
                                                    />
                                                    <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none group-hover/input:text-[#76D7B6] transition-colors" />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.2em] pr-4 opacity-60">Cerrado</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sedes Selection - Right Side - Col 5 */}
                        <div className="md:col-span-5 space-y-1 lg:space-y-2 flex flex-col h-full">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <MapPin className="h-3.5 w-3.5 text-slate-900" />
                                    </div>
                                    <h4 className="text-base font-semibold text-slate-900 tracking-tight">Aplicar a Sedes</h4>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm flex flex-col flex-1 overflow-hidden min-h-[300px]">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
                                        <div className="relative">
                                            <Loader2 className="h-12 w-12 animate-spin text-[#76D7B6] opacity-30" />
                                            <Loader2 className="h-12 w-12 animate-spin text-[#76D7B6] absolute top-0 left-0" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em]">Cargando sedes...</p>
                                    </div>
                                ) : sedes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 py-10 text-center gap-6">
                                        <div className="h-20 w-20 bg-slate-50 rounded-[32px] flex items-center justify-center shadow-inner">
                                            <MapPin className="h-10 w-10 text-slate-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-lg text-slate-900 font-semibold px-8 leading-tight">No hay sedes configuradas</p>
                                            <p className="text-sm text-slate-400 font-medium px-12">Agrega sedes en la configuración de la clínica para aplicar horarios.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full">
                                        {/* Info card moved up here */}
                                        <div className="p-3 bg-slate-50 shadow-inner">
                                            <div className="bg-[#76D7B6]/5 rounded-xl p-2.5 flex gap-2.5 border border-[#76D7B6]/10 shadow-sm">
                                                <div className="h-7 w-7 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                                    <Info className="h-3.5 w-3.5 text-[#76D7B6]" />
                                                </div>
                                                <div className="space-y-0 text-[11px]">
                                                    <p className="font-semibold text-[#76D7B6] uppercase tracking-wider text-[9px]">Aviso importante</p>
                                                    <p className="font-medium text-slate-500 leading-tight">
                                                        Se sincronizarán inmediatamente.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-slate-50">
                                            {/* Select All */}
                                            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/10"
                                                 onClick={() => {
                                                     if (selectedSedes.length === sedes.length) setSelectedSedes([]);
                                                     else setSelectedSedes(sedes.map(s => s.id));
                                                 }}>
                                                <Checkbox
                                                    id="select-all-sedes"
                                                    checked={selectedSedes.length === sedes.length}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedSedes(sedes.map(s => s.id));
                                                        else setSelectedSedes([]);
                                                    }}
                                                    className="data-[state=checked]:bg-[#76D7B6] data-[state=checked]:border-[#76D7B6] h-4 w-4 rounded-md border-2"
                                                />
                                                <div className="flex flex-col">
                                                    <label htmlFor="select-all-sedes" className="text-sm font-semibold text-slate-900 cursor-pointer tracking-tight">
                                                        Seleccionar Todas
                                                    </label>
                                                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Sincronización global</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-slate-100/10">
                                                {sedes.map((sede) => (
                                                    <div key={sede.id} 
                                                         className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-all cursor-pointer group"
                                                         onClick={() => {
                                                            if (selectedSedes.includes(sede.id)) setSelectedSedes(selectedSedes.filter(id => id !== sede.id));
                                                            else setSelectedSedes([...selectedSedes, sede.id]);
                                                         }}>
                                                        <Checkbox
                                                            id={`sede-${sede.id}`}
                                                            checked={selectedSedes.includes(sede.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) setSelectedSedes([...selectedSedes, sede.id]);
                                                                else setSelectedSedes(selectedSedes.filter(id => id !== sede.id));
                                                            }}
                                                            className="data-[state=checked]:bg-[#76D7B6] data-[state=checked]:border-[#76D7B6] h-4 w-4 rounded-md border-2"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-900 tracking-tight group-hover:text-[#76D7B6] transition-colors">{sede.name}</span>
                                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                                <MapPin className="h-2.5 w-2.5 opacity-50" />
                                                                <span className="text-[11px] font-semibold">Sucursal operativa</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
