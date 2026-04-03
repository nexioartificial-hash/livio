"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Clock, Download, Calendar, FileSpreadsheet, ChevronDown, UploadCloud, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import Papa from "papaparse";
import { toast } from "sonner";
import { z } from "zod";


const hours = Array.from({ length: 12 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); /* 08:00 to 19:00 */

interface Appointment {
    id: any;
    patient: string;
    professional: string;
    time: string;
    duration: number; // minutes
    reason: string;
    status: "pendiente" | "confirmado" | "cancelado";
    date: string; // YYYY-MM-DD
    source?: string;
    obra_social?: string;
}

interface ObraSocial {
    id: string;
    nombre: string;
    slug_corto: string;
    tipo: string;
    es_monotributo: boolean;
}

type ViewMode = "dia" | "semana" | "mes";

const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

function AgendaContent() {
    const searchParams = useSearchParams();
    const [view, setView] = useState<ViewMode>("semana");

    useEffect(() => {
        const v = searchParams.get('view');
        if (v === 'dia' || v === 'semana' || v === 'mes') {
            setView(v as ViewMode);
        }
    }, [searchParams]);

    const [selectedProfessional, setSelectedProfessional] = useState("all");
    const [selectedBranch, setSelectedBranch] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importStep, setImportStep] = useState<"select" | "action">("select");
    const [importSource, setImportSource] = useState<"csv" | "google" | "calendly" | "manual" | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [googleConnected, setGoogleConnected] = useState(false);

    // Details Modal State
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [selectedBloqueo, setSelectedBloqueo] = useState<any>(null);
    const [isBloqueoModalOpen, setIsBloqueoModalOpen] = useState(false);

    const { user, loading } = useAuth();
    const clinicId = (user as any)?.clinic_id as string | undefined;
    const { DateTime } = require("luxon");
    const [currentDate, setCurrentDate] = useState(DateTime.now());
    const [newAppointment, setNewAppointment] = useState({
        patient: "",
        professional: "",
        date: DateTime.now().toISODate(),
        time: "09:00",
        duration: "30",
        reason: "",
        obrasocial_id: "",
        sucursal: "",
        atencion_particular: false,
    });
    const [isCreating, setIsCreating] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [bloqueos, setBloqueos] = useState<{ id: string; profesional_id: string; bloqueo_desde: string; bloqueo_hasta: string; descripcion: string; tipo: string }[]>([]);
    const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
    const [obraSearch, setObraSearch] = useState("");
    const [obraOpen, setObraOpen] = useState(false);
    const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([{ id: "all", name: "Todos" }]);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([{ id: "all", name: "Todas" }]);

    // Core fetch logic extracted so it can be called imperatively too
    const doFetch = useCallback(async (cId: string, vw: string, date: any) => {
        let query = supabase.from('turno').select('*').eq('clinic_id', cId);

        let start, end;
        if (vw === "dia") {
            start = date.toISODate(); end = date.toISODate();
        } else if (vw === "semana") {
            start = date.startOf('week').toISODate(); end = date.endOf('week').toISODate();
        } else {
            start = date.startOf('month').toISODate(); end = date.endOf('month').toISODate();
        }
        query = query.gte('date', start).lte('date', end);

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching turnos:", error);
            toast.error(`Error al cargar turnos: ${error.message || 'Error de permisos'}`);
        } else {
            setAppointments(data.map((t: any) => ({
                id: t.id,
                patient: t.patient_name,
                professional: t.professional_name || "Sin asignar",
                time: t.time.substring(0, 5),
                duration: t.duration || 30,
                reason: t.reason,
                status: t.status,
                date: t.date,
                source: t.source,
                obra_social: t.obra_social || null,
            })));
        }

        const startISO = (vw === 'dia' ? date.startOf('day') : vw === 'semana' ? date.startOf('week') : date.startOf('month')).toISO();
        const endISO = (vw === 'dia' ? date.endOf('day') : vw === 'semana' ? date.endOf('week') : date.endOf('month')).toISO();

        const { data: bloqueosData } = await supabase
            .from('bloqueo_horario').select('*')
            .gte('bloqueo_hasta', startISO).lte('bloqueo_desde', endISO);
        if (bloqueosData) setBloqueos(bloqueosData);
    }, []); // no deps — all data passed as args

    // Imperative fetch (called after create/sync/etc)
    const fetchAppointments = useCallback(() => {
        if (!clinicId) return Promise.resolve();
        return doFetch(clinicId, view, currentDate);
    }, [clinicId, view, currentDate, doFetch]);

    // Auto-fetch: wait for auth to settle (loading=false) AND clinicId to be available
    useEffect(() => {
        if (loading || !clinicId) return;
        doFetch(clinicId, view, currentDate);
    }, [loading, clinicId, view, currentDate, doFetch]);

    // Load professionals and branches from Supabase
    useEffect(() => {
        if (!clinicId) return;

        supabase
            .from('professional')
            .select('id, full_name')
            .eq('clinic_id', clinicId)
            .eq('activo', true)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    const list = [
                        { id: "all", name: "Todos" },
                        ...data.map(p => ({ id: p.id, name: p.full_name || "Sin nombre" }))
                    ];
                    setProfessionals(list);
                    // Auto-set first professional in form if not already set
                    setNewAppointment(prev => prev.professional ? prev : { ...prev, professional: data[0].id });
                }
            });

        supabase
            .from('sucursal')
            .select('id, name')
            .eq('clinic_id', clinicId)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    const list = [
                        { id: "all", name: "Todas" },
                        ...data.map(s => ({ id: s.id, name: s.name }))
                    ];
                    setBranches(list);
                    // Auto-set first branch in form
                    setNewAppointment(prev => ({ ...prev, sucursal: data[0].name }));
                }
            });
    }, [clinicId]);

    // Check Google Calendar connection status
    useEffect(() => {
        if (!user?.id) return;
        supabase
            .from('professional')
            .select('google_refresh_token')
            .eq('id', user.id)
            .single()
            .then(({ data }) => setGoogleConnected(!!data?.google_refresh_token));
    }, [user?.id]);

    // Load obras sociales once
    useEffect(() => {
        supabase
            .from('obras_sociales')
            .select('id, nombre, slug_corto, tipo, es_monotributo')
            .eq('activo', true)
            .order('nombre')
            .then(({ data, error }) => {
                if (error) console.error('Error cargando obras sociales:', error);
                else if (data) setObrasSociales(data as ObraSocial[]);
            });
    }, []);

    const handleCreateAppointment = async () => {
        if (!newAppointment.patient || !newAppointment.professional || !newAppointment.date || !newAppointment.time) {
            toast.error("Por favor completá todos los campos obligatorios");
            return;
        }

        setIsCreating(true);
        try {
            // Find professional name
            const profName = professionals.find(p => p.id === newAppointment.professional)?.name || "Sin asignar";

            // Resolve obra social name from selection
            const obraNombre = newAppointment.atencion_particular
                ? "Atención particular"
                : newAppointment.obrasocial_id
                    ? obrasSociales.find(o => o.id === newAppointment.obrasocial_id)?.nombre ?? null
                    : null;

            // 0. Calculate new appointment timeframe
            const newStart = DateTime.fromISO(`${newAppointment.date}T${newAppointment.time}`);
            const newEnd = newStart.plus({ minutes: parseInt(newAppointment.duration) });

            // 1. Check for overlap with internal appointments (same professional)
            const internalOverlap = appointments.some(a => {
                // Only check for the same professional and active appointments
                if (a.professional !== profName || a.status === 'cancelado') return false;

                const aStart = DateTime.fromISO(`${a.date}T${a.time}`);
                const aEnd = aStart.plus({ minutes: a.duration });

                return newStart < aEnd && newEnd > aStart;
            });

            if (internalOverlap) {
                toast.warning(`⚠️ El profesional ${profName} ya tiene un turno agendado en ese horario.`);
                setIsCreating(false);
                return;
            }

            // 2. Check for overlap with external blocks (Google Calendar)
            const externalOverlap = bloqueos.some(b => {
                // Blocks are professional-specific
                if (b.profesional_id && b.profesional_id !== newAppointment.professional) return false;

                const bStart = DateTime.fromISO(b.bloqueo_desde);
                const bEnd = DateTime.fromISO(b.bloqueo_hasta);
                return newStart < bEnd && newEnd > bStart;
            });

            if (externalOverlap) {
                toast.warning("⚠️ El horario se superpone con un bloqueo externo (Google Calendar)");
                setIsCreating(false);
                return;
            }

            const { data: inserted, error } = await supabase.from('turno').insert({
                clinic_id: (user as any).clinic_id,
                professional_id: newAppointment.professional,
                patient_name: newAppointment.patient,
                professional_name: profName,
                date: newAppointment.date,
                time: newAppointment.time,
                duration: parseInt(newAppointment.duration),
                reason: newAppointment.reason,
                status: 'pendiente',
                sucursal: newAppointment.sucursal,
                source: 'manual',
                obra_social: obraNombre,
            }).select('id');

            if (error) throw error;

            // Push to Google Calendar asynchronously (fire and forget)
            const turnoId = Array.isArray(inserted) ? inserted[0]?.id : (inserted as any)?.id;
            if (turnoId) {
                fetch('/api/integrations/google/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ turnoId, action: 'create' }),
                }).catch(() => { }); // silent — don't block UX
            }

            toast.success("Turno agendado correctamente");
            setIsModalOpen(false);
            // Reset form keeping the current professional/branch defaults
            const firstBranch = branches.find(b => b.id !== "all")?.name ?? "";
            const firstProfessional = professionals.find(p => p.id !== "all")?.id ?? "";
            setNewAppointment({
                patient: "",
                professional: firstProfessional,
                date: DateTime.now().toISODate(),
                time: "09:00",
                duration: "30",
                reason: "",
                obrasocial_id: "",
                sucursal: firstBranch,
                atencion_particular: false,
            });
            setObraSearch("");
            fetchAppointments(); // Refresh grid
        } catch (error: any) {
            console.error("Error creating appointment:", error);
            const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
            toast.error("Error al agendar turno: " + (errorMsg === '{}' ? "Error interno de validación" : errorMsg));
        } finally {
            setIsCreating(false);
        }
    };

    const handleAppointmentClick = (appt: Appointment) => {
        setSelectedAppointment(appt);
        setIsDetailsModalOpen(true);
    };

    // Navigation Handlers
    const handlePrev = () => {
        if (view === "dia") setCurrentDate(currentDate.minus({ days: 1 }));
        if (view === "semana") setCurrentDate(currentDate.minus({ weeks: 1 }));
        if (view === "mes") setCurrentDate(currentDate.minus({ months: 1 }));
    };

    const handleNext = () => {
        if (view === "dia") setCurrentDate(currentDate.plus({ days: 1 }));
        if (view === "semana") setCurrentDate(currentDate.plus({ weeks: 1 }));
        if (view === "mes") setCurrentDate(currentDate.plus({ months: 1 }));
    };

    // Dynamic Headers
    const weekStart = currentDate.startOf('week');
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = weekStart.plus({ days: i });
        return {
            label: `${d.toFormat('ccc', { locale: 'es' })} ${d.day}`.charAt(0).toUpperCase() + `${d.toFormat('ccc', { locale: 'es' })} ${d.day}`.slice(1),
            dayNum: d.day,
            date: d
        };
    });

    const monthLabel = currentDate.toFormat('MMMM yyyy', { locale: 'es' }).charAt(0).toUpperCase() + currentDate.toFormat('MMMM yyyy', { locale: 'es' }).slice(1);

    // Helper to calculate display status
    const getDisplayStatus = (appt: Appointment) => {
        if (appt.status === "cancelado") return "cancelado";

        const now = DateTime.now();
        const start = DateTime.fromISO(`${appt.date}T${appt.time}`);
        const end = start.plus({ minutes: appt.duration });

        if (now >= start && now < end) {
            return "en curso";
        }

        if (appt.status === "pendiente" && now > end) {
            return "finalizado"; // Or "vencido" if preferred, but finalizado is neutral
        }

        return appt.status;
    };

    const getStatusColor = (status: string, appt?: Appointment) => {
        // Evaluate dynamic status if appointment provided
        const finalStatus = appt ? getDisplayStatus(appt) : status;

        switch (finalStatus) {
            case "en curso": return "bg-blue-100 border-l-blue-500 text-blue-800 animate-pulse";
            case "confirmado": return "bg-green-100 border-l-green-500 text-green-800";
            case "pendiente": return "bg-yellow-50 border-l-yellow-500 text-yellow-800";
            case "finalizado": return "bg-slate-100 dark:bg-slate-800 border-l-slate-400 text-slate-600 dark:text-slate-400";
            case "cancelado": return "bg-red-50 border-l-red-400 text-red-700";
            default: return "bg-slate-50 dark:bg-slate-900 border-l-slate-300";
        }
    };

    const filteredAppointments = appointments.filter(a => {
        if (selectedProfessional !== "all" && a.professional !== professionals.find(p => p.id === selectedProfessional)?.name) return false;
        if (selectedStatus !== "all" && getDisplayStatus(a) !== selectedStatus) return false;
        return true;
    });

    const filteredBloqueos = bloqueos.filter(b => {
        if (selectedProfessional !== "all" && b.profesional_id !== selectedProfessional) return false;
        return true;
    });

    // --- GOOGLE INTEGRATION ---
    const handleGoogleConnect = () => {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
            '/api/integrations/google/auth',
            'GoogleAuth',
            `width=${width},height=${height},top=${top},left=${left}`
        );

        const handleMessage = async (event: MessageEvent) => {
            if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                window.removeEventListener('message', handleMessage);
                setIsImporting(true);

                try {
                    // Trigger server-side pull
                    const res = await fetch('/api/integrations/google/pull', {
                        method: 'POST',
                        body: JSON.stringify({ profesionalId: user?.id })
                    });

                    if (!res.ok) throw new Error('Error al sincronizar con Google');

                    const syncData = await res.json();
                    const syncedCount = syncData.results?.[0]?.found || 0;

                    setGoogleConnected(true);
                    toast.success(`✅ Google Calendar conectado! Se encontraron ${syncedCount} eventos.`);
                    setIsImportModalOpen(false);
                    fetchAppointments(); // Refresh grid
                } catch (error: any) {
                    toast.error("Error al sincronizar eventos: " + error.message);
                } finally {
                    setIsImporting(false);
                }
            } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
                toast.error(`Error de Google: ${event.data.reason}`);
            }
        };

        window.addEventListener('message', handleMessage);
    };

    const handleGoogleDisconnect = async () => {
        if (!user?.id) return;
        setIsImporting(true);
        try {
            const res = await fetch('/api/integrations/google/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profesionalId: user.id })
            });
            if (!res.ok) throw new Error('Error al desconectar');
            setGoogleConnected(false);
            toast.success("Google Calendar desconectado");
            setIsImportModalOpen(false);
            fetchAppointments();
        } catch (error: any) {
            toast.error("Error al desconectar: " + error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleGoogleResync = async () => {
        if (!user?.id) return;
        setIsImporting(true);
        try {
            const res = await fetch('/api/integrations/google/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profesionalId: user.id })
            });
            if (!res.ok) throw new Error('Error al sincronizar');
            const syncData = await res.json();
            const syncedCount = syncData.results?.[0]?.found || 0;
            toast.success(`✅ Sincronizado! ${syncedCount} eventos encontrados.`);
            setIsImportModalOpen(false);
            fetchAppointments();
        } catch (error: any) {
            toast.error("Error al sincronizar: " + error.message);
        } finally {
            setIsImporting(false);
        }
    };

    // --- CALENDLY INTEGRATION ---
    const handleCalendlyConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = (e.target as any).token.value;
        if (!token) return toast.error("Ingresa tu token de Calendly");

        setIsImporting(true);
        try {
            const res = await fetch(`/api/integrations/calendly?token=${token}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            const events = data.collection; // Calendly API response structure
            const turnosToInsert = events.map((evt: any) => ({
                patient_name: evt.invitees_counter.active > 0 ? "Paciente Calendly" : "Evento", // Calendly payload varies
                professional_name: "Calendly",
                date: evt.start_time.split('T')[0],
                time: evt.start_time.split('T')[1].substring(0, 5),
                reason: evt.name,
                source: 'calendly',
                status: 'pendiente',
                sucursal: 'Sede Central'
            }));

            if (turnosToInsert.length > 0) {
                const { error } = await supabase.from('turno').insert(turnosToInsert);
                if (error) throw error;
                toast.success(`¡${turnosToInsert.length} turnos importados de Calendly!`);
                setIsImportModalOpen(false);
            } else {
                toast.info("No se encontraron eventos para importar.");
            }

        } catch (error: any) {
            toast.error("Error Calendly: " + error.message);
        } finally {
            setIsImporting(false);
        }
    }

    // --- CSV IMPORT ---
    const handleCSVImport = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const file = (event.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0];

        if (!file) {
            toast.error("Por favor selecciona un archivo CSV");
            return;
        }

        setIsImporting(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data as any[];
                    // 1. Validate & Upsert Patients
                    const patientSchema = z.object({
                        nombre: z.string().min(1),
                        dni: z.string().optional(),
                        email: z.string().email().optional().or(z.literal("")),
                        telefono: z.string().optional(),
                        obra_social: z.string().optional(),
                        fecha: z.string().optional(), // Appointment fields
                        hora: z.string().optional(),
                        motivo: z.string().optional(),
                        profesional: z.string().optional(),
                        duracion: z.string().optional(),
                    });

                    const validPatients = [];
                    const turnosToInsert = [];
                    let errors = 0;

                    for (const row of rows) {
                        const parsing = patientSchema.safeParse(row);
                        if (parsing.success) {
                            const p = parsing.data;
                            // Add to patients list (distinct by DNI ideally, but for MVP upsert batch)
                            validPatients.push({
                                full_name: p.nombre,
                                dni: p.dni || null,
                                phone: p.telefono || null,
                                email: p.email || null,
                                obra_social: p.obra_social || null,
                                status: 'activo',
                            });

                            // Add to turnos list if date/time present
                            if (p.fecha && p.hora) {
                                turnosToInsert.push({
                                    patient_name: p.nombre, // We'll link ID later if needed, mostly display for now
                                    professional_name: p.profesional || "Sin asignar",
                                    date: p.fecha,
                                    time: p.hora,
                                    duration: parseInt(p.duracion || "30"),
                                    reason: p.motivo || "Importado",
                                    source: 'excel',
                                    status: 'pendiente',
                                    sucursal: 'Sede Central'
                                });
                            }
                        } else {
                            errors++;
                        }
                    }

                    if (validPatients.length > 0) {
                        // Upsert Patients
                        const { error: pError } = await supabase.from('patient').upsert(validPatients, { onConflict: 'dni' });
                        if (pError) throw pError;

                        // Insert Turnos
                        if (turnosToInsert.length > 0) {
                            const { error: tError } = await supabase.from('turno').insert(turnosToInsert);
                            if (tError) throw tError;
                        }

                        toast.success(`Importado: ${validPatients.length} pacientes y ${turnosToInsert.length} turnos`);
                        if (errors > 0) toast.warning(`${errors} filas ignoradas`);
                        setIsImportModalOpen(false);
                    } else {
                        toast.error("No se encontraron datos válidos.");
                    }

                } catch (error: any) {
                    console.error("Import error:", error);
                    toast.error("Error al importar: " + error.message);
                } finally {
                    setIsImporting(false);
                }
            },
            error: (error) => {
                toast.error("Error al leer el archivo CSV");
                setIsImporting(false);
            }
        });
    };

    const handleUpdateStatus = async (id: any, newStatus: string) => {
        try {
            const { error } = await supabase.from('turno').update({ status: newStatus }).eq('id', id);
            if (error) throw error;

            toast.success(`Turno ${newStatus}`);
            setIsDetailsModalOpen(false);
            fetchAppointments();
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast.error("Error al actualizar turno");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Agenda</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold gap-2 h-10 px-4" onClick={() => setIsImportModalOpen(true)}>
                        <Download className="h-4 w-4" /> Importar
                    </Button>

                    <Button className="bg-accent hover:bg-accent/90 text-slate-900 dark:text-white font-bold gap-2 h-10 px-6 shadow-sm hover:shadow-md transition-all" onClick={() => setIsModalOpen(true)}>
                        <Plus className="h-4 w-4" /> Nuevo Turno
                    </Button>
                </div>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-400 pl-1">Profesional</span>
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
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-400 pl-1">Sede</span>
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
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-400 pl-1">Estado</span>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="confirmado">Confirmado</SelectItem>
                                <SelectItem value="en curso">En curso</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                                <SelectItem value="finalizado">Finalizado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>


                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300 min-w-[140px] text-center capitalize">
                        {monthLabel}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>

                    <div className="flex ml-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        {(["dia", "semana", "mes"] as ViewMode[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === v ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-300"}`}
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
                                <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b bg-slate-50 dark:bg-slate-900">
                                    <div className="p-3 text-xs font-medium text-slate-500 dark:text-slate-400 border-r">Hora</div>
                                    {weekDays.map((day, i) => {
                                        const isToday = day.date.hasSame(DateTime.now(), 'day');
                                        return (
                                            <div key={i} className={`p-3 text-center text-xs font-medium border-r last:border-r-0 ${isToday ? "bg-accent/5 text-accent font-bold" : "text-slate-600 dark:text-slate-400"}`}>
                                                {day.label}
                                                {isToday && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-accent mx-auto"></div>}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Time Rows */}
                                {hours.map(hour => (
                                    <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0 min-h-[60px]">
                                        <div className="p-2 text-xs text-slate-400 border-r flex items-start justify-end pr-3 pt-1">{hour}</div>
                                        {weekDays.map((dayObj, dayIdx) => {
                                            const dayDate = dayObj.date.toISODate();
                                            const isToday = dayObj.date.hasSame(DateTime.now(), 'day');

                                            // Slots boundaries
                                            const slotStart = dayObj.date.set({
                                                hour: parseInt(hour.split(':')[0]),
                                                minute: 0
                                            });
                                            const slotEnd = slotStart.plus({ hours: 1 });

                                            // Filter appointments that intersect with this hour slot
                                            const dayAppts = filteredAppointments.filter(a => {
                                                if (a.date !== dayDate) return false;
                                                const aStart = DateTime.fromISO(`${a.date}T${a.time}`);
                                                const aEnd = aStart.plus({ minutes: a.duration });
                                                return aStart < slotEnd && aEnd > slotStart;
                                            });

                                            // Filter bloqueos that intersect with this hour slot
                                            const dayBloqueos = filteredBloqueos.filter(b => {
                                                const bStart = DateTime.fromISO(b.bloqueo_desde);
                                                const bEnd = DateTime.fromISO(b.bloqueo_hasta);
                                                return bStart < slotEnd && bEnd > slotStart;
                                            });

                                            return (
                                                <div key={dayIdx} className={`border-r last:border-r-0 p-1 ${isToday ? "bg-accent/[0.02]" : ""}`}>
                                                    {/* Bloqueos externos */}
                                                    {dayBloqueos.map(b => (
                                                        <div
                                                            key={b.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedBloqueo(b);
                                                                setIsBloqueoModalOpen(true);
                                                            }}
                                                            title={b.descripcion}
                                                            className="rounded-md border-l-[3px] border-slate-300 bg-slate-50 dark:bg-slate-900 p-2 text-xs text-slate-500 dark:text-slate-400 mb-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors"
                                                        >
                                                            <p className="font-semibold truncate flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                                                {b.descripcion || 'Bloqueado'}
                                                            </p>
                                                            <p className="text-[10px] opacity-60">Sincronizado</p>
                                                        </div>
                                                    ))}
                                                    {dayAppts.map(appt => (
                                                        <div
                                                            key={appt.id}
                                                            onClick={() => handleAppointmentClick(appt)}
                                                            className={`rounded-md border-l-[3px] p-2 text-xs cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(appt.status, appt)}`}
                                                        >
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
                        <div className="border-b bg-slate-50 dark:bg-slate-900 p-3 text-center">
                            <span className="text-sm font-bold text-accent capitalize">
                                {currentDate.toFormat("cccc d 'de' MMMM", { locale: 'es' })}
                            </span>
                        </div>
                        {hours.map(hour => {
                            const dateStr = currentDate.toISODate();

                            const slotStart = currentDate.set({
                                hour: parseInt(hour.split(':')[0]),
                                minute: 0
                            });
                            const slotEnd = slotStart.plus({ hours: 1 });

                            const appts = filteredAppointments.filter(a => {
                                if (a.date !== dateStr) return false;
                                const aStart = DateTime.fromISO(`${a.date}T${a.time}`);
                                const aEnd = aStart.plus({ minutes: a.duration });
                                return aStart < slotEnd && aEnd > slotStart;
                            });

                            const dayBloqueos = filteredBloqueos.filter(b => {
                                const bStart = DateTime.fromISO(b.bloqueo_desde);
                                const bEnd = DateTime.fromISO(b.bloqueo_hasta);
                                return bStart < slotEnd && bEnd > slotStart;
                            });
                            return (
                                <div key={hour} className="flex border-b last:border-b-0 min-h-[56px]">
                                    <div className="w-20 p-2 text-xs text-slate-400 border-r flex items-start justify-end pr-3 pt-2 flex-shrink-0">{hour}</div>
                                    <div className="flex-1 p-1.5">
                                        {/* Bloqueos externos */}
                                        {dayBloqueos.map(b => (
                                            <div
                                                key={b.id}
                                                onClick={() => {
                                                    setSelectedBloqueo(b);
                                                    setIsBloqueoModalOpen(true);
                                                }}
                                                className="rounded-lg border-l-[3px] border-slate-300 bg-slate-50 dark:bg-slate-900 p-3 text-slate-500 dark:text-slate-400 mb-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-sm flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                                        {b.descripcion || 'Bloqueado'}
                                                    </span>
                                                    <span className="text-[10px] opacity-60">Google Calendar</span>
                                                </div>
                                            </div>
                                        ))}
                                        {appts.map(appt => (
                                            <div
                                                key={appt.id}
                                                onClick={() => handleAppointmentClick(appt)}
                                                className={`rounded-lg border-l-[3px] p-3 cursor-pointer hover:shadow-md transition ${getStatusColor(appt.status, appt)}`}
                                            >
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
                            {/* Headers */}
                            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
                                <div key={d} className="p-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{d}</div>
                            ))}

                            {/* Empty cells for days before the 1st of the month */}
                            {Array.from({ length: currentDate.startOf('month').weekday - 1 }).map((_, i) => (
                                <div key={`empty-${i}`} className="p-2 min-h-[80px]" />
                            ))}

                            {/* Days of the month */}
                            {Array.from({ length: currentDate.daysInMonth || 30 }, (_, i) => {
                                const dayNum = i + 1;
                                const date = currentDate.set({ day: dayNum });
                                const dateStr = date.toISODate();
                                const dayAppts = filteredAppointments.filter(a => a.date === dateStr);
                                const isToday = date.hasSame(DateTime.now(), 'day');

                                return (
                                    <div key={i} className={`rounded-lg p-2 min-h-[80px] text-xs border ${isToday ? "bg-accent/5 border-accent" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900"}`}>
                                        <span className={`font-medium ${isToday ? "text-accent font-bold" : "text-slate-600 dark:text-slate-400"}`}>{dayNum}</span>
                                        <div className="mt-1 space-y-0.5">
                                            {/* Bloqueos */}
                                            {filteredBloqueos.filter(b => {
                                                const bStart = DateTime.fromISO(b.bloqueo_desde);
                                                const bEnd = DateTime.fromISO(b.bloqueo_hasta);
                                                const dStart = date.startOf('day');
                                                const dEnd = date.endOf('day');
                                                return bStart < dEnd && bEnd > dStart;
                                            }).map(b => (
                                                <div
                                                    key={b.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBloqueo(b);
                                                        setIsBloqueoModalOpen(true);
                                                    }}
                                                    className="rounded px-1.5 py-0.5 text-[10px] truncate bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-l-2 border-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    {b.descripcion || 'Bloqueado'}
                                                </div>
                                            ))}

                                            {dayAppts.slice(0, 2).map(a => (
                                                <div
                                                    key={a.id}
                                                    onClick={() => handleAppointmentClick(a)}
                                                    className={`rounded px-1.5 py-0.5 text-[10px] truncate cursor-pointer hover:opacity-80 ${getStatusColor(a.status, a).replace("border-l-[3px]", "border-l-2")}`}
                                                >
                                                    {a.time} {a.patient.split(" ")[0]}
                                                </div>
                                            ))}
                                            {(dayAppts.length > 2) && <span className="text-[10px] text-slate-400">+{dayAppts.length - 2} más</span>}
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
                            <Input
                                className="col-span-3"
                                placeholder="Buscar paciente..."
                                value={newAppointment.patient}
                                onChange={(e) => setNewAppointment({ ...newAppointment, patient: toTitleCase(e.target.value) })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Profesional</Label>
                            <Select
                                value={newAppointment.professional}
                                onValueChange={(val) => setNewAppointment({ ...newAppointment, professional: val })}
                            >
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
                            <Input
                                className="col-span-3"
                                type="date"
                                value={newAppointment.date}
                                onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Hora</Label>
                            <Input
                                className="col-span-3"
                                type="time"
                                value={newAppointment.time}
                                onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Duración</Label>
                            <Select
                                value={newAppointment.duration}
                                onValueChange={(val) => setNewAppointment({ ...newAppointment, duration: val })}
                            >
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
                            <Input
                                className="col-span-3"
                                placeholder="Ej: Limpieza, Control, Ortodoncia..."
                                value={newAppointment.reason}
                                onChange={(e) => setNewAppointment({ ...newAppointment, reason: toTitleCase(e.target.value) })}
                            />
                        </div>

                        {/* Sede */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Sede</Label>
                            <Select
                                value={newAppointment.sucursal}
                                onValueChange={(val) => setNewAppointment({ ...newAppointment, sucursal: val })}
                            >
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {branches.filter(b => b.id !== "all").map(b => (
                                        <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Obra Social — searchable dropdown */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right text-sm pt-2">Obra Social</Label>
                            <div className="col-span-3 relative">
                                <Input
                                    placeholder={newAppointment.atencion_particular ? "Atención particular" : "Buscar obra social..."}
                                    disabled={newAppointment.atencion_particular}
                                    value={
                                        newAppointment.atencion_particular ? ""
                                            : newAppointment.obrasocial_id
                                                ? (obrasSociales.find(o => o.id === newAppointment.obrasocial_id)?.nombre ?? obraSearch)
                                                : obraSearch
                                    }
                                    onChange={(e) => {
                                        setObraSearch(e.target.value);
                                        setObraOpen(true);
                                        if (!e.target.value) setNewAppointment({ ...newAppointment, obrasocial_id: "" });
                                    }}
                                    onFocus={() => setObraOpen(true)}
                                    onBlur={() => setTimeout(() => setObraOpen(false), 150)}
                                />
                                {obraOpen && obraSearch.length > 0 && !newAppointment.atencion_particular && (
                                    <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg">
                                        {obrasSociales
                                            .filter(o => o.nombre.toLowerCase().includes(obraSearch.toLowerCase()))
                                            .slice(0, 8)
                                            .map(o => (
                                                <button
                                                    key={o.id}
                                                    type="button"
                                                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 text-left"
                                                    onMouseDown={() => {
                                                        setNewAppointment({ ...newAppointment, obrasocial_id: o.id });
                                                        setObraSearch("");
                                                        setObraOpen(false);
                                                    }}
                                                >
                                                    <span className="truncate">{o.nombre}</span>
                                                    <span className={`ml-2 shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${o.tipo === 'prepaga' ? 'bg-blue-100 text-blue-700' :
                                                        o.tipo === 'mutual' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>{o.tipo}</span>
                                                </button>
                                            ))}
                                        {obrasSociales.filter(o => o.nombre.toLowerCase().includes(obraSearch.toLowerCase())).length === 0 && (
                                            <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
                                        )}
                                    </div>
                                )}
                                {newAppointment.obrasocial_id && !newAppointment.atencion_particular && (
                                    <button
                                        type="button"
                                        className="mt-1 text-xs text-slate-400 hover:text-red-500"
                                        onClick={() => { setNewAppointment({ ...newAppointment, obrasocial_id: "" }); setObraSearch(""); }}
                                    >
                                        ✕ Quitar obra social
                                    </button>
                                )}

                                {/* Atención particular */}
                                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 h-3.5 w-3.5 accent-accent"
                                        checked={newAppointment.atencion_particular}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setNewAppointment({ ...newAppointment, atencion_particular: checked, obrasocial_id: "" });
                                            if (checked) setObraSearch("");
                                        }}
                                    />
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Atención particular</span>
                                </label>
                            </div>
                        </div>
                    </div>


                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button
                            className="bg-accent hover:bg-accent/90 text-slate-900 dark:text-white font-bold"
                            onClick={handleCreateAppointment}
                            disabled={isCreating}
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agendar Turno"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>




            {/* View Details Modal */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedAppointment?.patient}
                            <Badge className={selectedAppointment ? getStatusColor(selectedAppointment.status, selectedAppointment).replace("border-l-[3px]", "") : ""}>
                                {selectedAppointment ? getDisplayStatus(selectedAppointment) : ""}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>Detalles del turno</DialogDescription>
                    </DialogHeader>
                    {selectedAppointment && (
                        <div className="space-y-4 py-2">
                            {/* ... (Existing Details) ... */}
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Fecha:</span>
                                <span className="col-span-2">{selectedAppointment.date} a las {selectedAppointment.time}hs</span>
                            </div>
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Profesional:</span>
                                <span className="col-span-2">{selectedAppointment.professional}</span>
                            </div>
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Motivo:</span>
                                <span className="col-span-2">{selectedAppointment.reason}</span>
                            </div>
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Duración:</span>
                                <span className="col-span-2">{selectedAppointment.duration} min</span>
                            </div>
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Origen:</span>
                                <span className="col-span-2 capitalize">{selectedAppointment.source || "Manual"}</span>
                            </div>
                            {selectedAppointment.obra_social && (
                                <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">Obra Social:</span>
                                    <span className="col-span-2">{selectedAppointment.obra_social}</span>
                                </div>
                            )}

                        </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        {selectedAppointment?.status !== 'cancelado' && (
                            <Button
                                variant="destructive"
                                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                onClick={() => handleUpdateStatus(selectedAppointment?.id, 'cancelado')}
                            >
                                Cancelar Turno
                            </Button>
                        )}

                        {selectedAppointment?.status === 'pendiente' && (
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleUpdateStatus(selectedAppointment?.id, 'confirmado')}
                            >
                                Confirmar Asistencia
                            </Button>
                        )}

                        {selectedAppointment?.status === 'cancelado' && (
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleUpdateStatus(selectedAppointment?.id, 'pendiente')}
                            >
                                Restaurar Turno
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bloqueo Detail Modal */}
            <Dialog open={isBloqueoModalOpen} onOpenChange={setIsBloqueoModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-slate-400" />
                            Evento Externo
                        </DialogTitle>
                        <DialogDescription>
                            Este es un evento sincronizado desde Google Calendar.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBloqueo && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Título:</span>
                                <span className="col-span-2 font-bold">{selectedBloqueo.descripcion}</span>
                            </div>
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Inicio:</span>
                                <span className="col-span-2">
                                    {DateTime.fromISO(selectedBloqueo.bloqueo_desde).toFormat("dd/MM/yyyy HH:mm")}hs
                                </span>
                            </div>
                            <div className="grid grid-cols-3 items-start gap-2 text-sm">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Fin:</span>
                                <span className="col-span-2">
                                    {DateTime.fromISO(selectedBloqueo.bloqueo_hasta).toFormat("dd/MM/yyyy HH:mm")}hs
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 italic">
                                Sincronizado para proteger tu disponibilidad. Para editar este evento, hazlo directamente en tu Google Calendar.
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button className="w-full" onClick={() => setIsBloqueoModalOpen(false)}>
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Modal */}
            <Dialog open={isImportModalOpen} onOpenChange={(open) => {
                setIsImportModalOpen(open);
                if (!open) { setImportStep("select"); setImportSource(null); }
            }}>
                <DialogContent className="max-w-2xl mx-auto">
                    <DialogHeader>
                        <DialogTitle>Importar Agenda</DialogTitle>
                        <DialogDescription>
                            {importStep === "select" ? "Selecciona el origen de tus datos." :
                                importSource === "csv" ? "Sube tu archivo .csv" :
                                    importSource === "google" ? "Conectar con Google Calendar" :
                                        "Conectar con Calendly"}
                        </DialogDescription>
                    </DialogHeader>

                    {/* STEP 1: SELECT SOURCE */}
                    {importStep === "select" && (
                        <div className="grid grid-cols-2 gap-4 py-4">
                            {[
                                { id: "google", label: "Google Calendar", icon: Calendar, color: "text-blue-500", desc: googleConnected ? "Conectado" : "Sincronización directa" },
                                { id: "csv", label: "Excel / CSV", icon: FileSpreadsheet, color: "text-green-500", desc: "Pacientes y Turnos" },
                                { id: "calendly", label: "Calendly", icon: Clock, color: "text-indigo-500", desc: "Importar eventos" },
                                { id: "manual", label: "Manual", icon: Plus, color: "text-slate-500 dark:text-slate-400", desc: "Carga rápida" },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        if (opt.id === "manual") {
                                            setIsImportModalOpen(false);
                                            setIsModalOpen(true);
                                        } else {
                                            setImportSource(opt.id as any);
                                            setImportStep("action");
                                        }
                                    }}
                                    className="flex flex-col items-center justify-center p-6 border-2 border-slate-100 dark:border-slate-800 rounded-xl hover:border-accent hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 transition-all gap-3 relative"
                                >
                                    <opt.icon className={`h-8 w-8 ${opt.color}`} />
                                    <div className="text-center">
                                        <p className="font-bold text-slate-700 dark:text-slate-300">{opt.label}</p>
                                        <p className={`text-xs ${opt.id === "google" && googleConnected ? "text-emerald-500 font-medium" : "text-slate-400"}`}>{opt.desc}</p>
                                    </div>
                                    {opt.id === "google" && googleConnected && (
                                        <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: ACTIONS */}
                    {importStep === "action" && (
                        <div>
                            {importSource === "csv" && (
                                <form onSubmit={handleCSVImport} className="space-y-6 py-4">
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center space-y-4 hover:border-accent hover:bg-accent/5 transition-all group relative">
                                        <UploadCloud className="h-10 w-10 text-slate-300 group-hover:text-accent" />
                                        <div className="text-center space-y-1">
                                            <p className="font-bold text-slate-700 dark:text-slate-300">Click para subir CSV</p>
                                            <p className="text-xs text-slate-400">Columnas: nombre, dni, fecha, hora...</p>
                                        </div>
                                        <Input id="file" name="file" type="file" accept=".csv" required className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="ghost" onClick={() => setImportStep("select")}>Volver</Button>
                                        <Button type="submit" className="bg-accent text-slate-900 dark:text-white font-bold" disabled={isImporting}>
                                            {isImporting ? <Loader2 className="animate-spin" /> : "Importar CSV"}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {importSource === "google" && (
                                <div className="py-8 text-center space-y-6">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${googleConnected ? "bg-emerald-50" : "bg-blue-50"}`}>
                                        <Calendar className={`h-8 w-8 ${googleConnected ? "text-emerald-500" : "text-blue-500"}`} />
                                    </div>
                                    {googleConnected ? (
                                        <>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-slate-700 dark:text-slate-300">Google Calendar conectado</p>
                                                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                                                    Podés sincronizar para traer los últimos eventos, o desconectar para desvincular tu cuenta.
                                                </p>
                                            </div>
                                            <div className="flex justify-center gap-2">
                                                <Button type="button" variant="ghost" onClick={() => setImportStep("select")}>Volver</Button>
                                                <Button
                                                    onClick={handleGoogleDisconnect}
                                                    disabled={isImporting}
                                                    variant="outline"
                                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold gap-2"
                                                >
                                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desconectar"}
                                                </Button>
                                                <Button
                                                    onClick={handleGoogleResync}
                                                    disabled={isImporting}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                                                >
                                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sincronizar ahora"}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                                Serás redirigido a Google para autorizar el acceso a tu calendario. Importaremos los eventos de los próximos 30 días.
                                            </p>
                                            <div className="flex justify-center gap-2">
                                                <Button type="button" variant="ghost" onClick={() => setImportStep("select")}>Volver</Button>
                                                <Button onClick={handleGoogleConnect} disabled={isImporting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar Google"}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {importSource === "calendly" && (
                                <form onSubmit={handleCalendlyConnect} className="py-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Personal Access Token</Label>
                                        <Input name="token" placeholder="Pegá tu token de Calendly aquí..." required />
                                        <p className="text-xs text-slate-400">Puedes generarlo en Configuraci&oacute;n &gt; Integraciones en Calendly.</p>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setImportStep("select")}>Volver</Button>
                                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                            {isImporting ? <Loader2 className="animate-spin" /> : "Importar de Calendly"}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function AgendaPage() {
    return (
        <Suspense fallback={
            <div className="h-[80vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        }>
            <AgendaContent />
        </Suspense>
    );
}
