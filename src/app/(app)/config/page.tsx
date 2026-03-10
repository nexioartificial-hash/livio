"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Building2,
    MapPin,
    Plus,
    ShieldCheck,
    MoreVertical,
    Trash2,
    Send,
    Crown,
    MessageSquare,
    Stethoscope,
    CalendarDays,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Loader2,
    Link as LinkIcon,
    ExternalLink,
    Package,
    Utensils,
    HeartPulse,
    FileSpreadsheet,
    Download
} from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { DateTime } from "luxon";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateMemberRole, deleteMember, getTeamMembers } from "@/app/actions/team";
import SedeModal from "@/components/sucursales/SedeModal";
import { supabase, createClient } from "@/lib/supabase/client";
import ClinicConfigForm from "@/components/clinica/ClinicConfigForm";
import { SimpleTeamTable } from "@/components/team/SimpleTeamTable";
import { AddMemberFAB } from "@/components/team/AddMemberFAB";
import StockModal from "@/components/stock/StockModal";
import ImportStockModal from "@/components/stock/ImportStockModal";
import ObrasSocialesModal from "@/components/obras-sociales/ObrasSocialesModal";
import ImportObrasSocialesModal from "@/components/obras-sociales/ImportObrasSocialesModal";
import { TratamientosTab } from "@/components/config/TratamientosTab";
import { ObrasSocialesTab } from "@/components/config/ObrasSocialesTab";
import { InventarioTab } from "@/components/config/InventarioTab";

/**
 * Small component that reads OAuth redirect result from URL params.
 * Must be isolated so it can be wrapped in <Suspense> (Next.js requirement for useSearchParams).
 */

export default function ConfigPage() {
    const { user, clinic, loading } = useAuth();
    const { subscription, daysLeft, trialProgress, isPro, loading: subLoading, refresh: refreshSub } = useSubscription();
    const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

    // Google Calendar integration state
    const [googleProfile, setGoogleProfile] = useState<{
        email: string | null;
        syncEnabled: boolean;
        connected: boolean;
    }>({ email: null, syncEnabled: false, connected: false });
    const [isSyncToggling, setIsSyncToggling] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>("Iniciando...");
    const [mountTime, setMountTime] = useState(0);

    // Track time since mount to avoid premature "Restricted Access"
    useEffect(() => {
        const interval = setInterval(() => setMountTime(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Safety timeout for loading state text
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setDebugInfo("Validando tu sesión con el servidor...");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    useEffect(() => {
        if (!loading) {
            console.log("📋 [Config] Auth check:", { hasUser: !!user, role: user?.role, clinic_id: (user as any)?.clinic_id });
        }
    }, [user, loading]);

    // ─── Google OAuth Popup Handler ───────────────────────────────────────
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                const email = event.data.email;
                toast.success(`✅ Google Calendar conectado (${email})`);
                setGoogleProfile(p => ({ ...p, email, connected: true }));

                // Trigger auto-pull after connection
                fetch('/api/integrations/google/pull', {
                    method: 'POST',
                    body: JSON.stringify({ profesionalId: user?.id })
                }).catch(console.error);
            } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
                const reason = event.data.reason;
                const debugUri = event.data.debug_uri;
                toast.error(
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">Error de Google: {reason}</span>
                        {debugUri && (
                            <span className="text-xs opacity-80">
                                URI esperada: {debugUri}
                            </span>
                        )}
                    </div>,
                    { duration: 10000 }
                );
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleConnectGoogle = () => {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        window.open(
            '/api/integrations/google/auth',
            'google-auth',
            `width=${width},height=${height},left=${left},top=${top}`
        );
    };

    // Load current Google profile from DB
    useEffect(() => {
        if (!user) return;
        supabase
            .from('professional')
            .select('google_user_email, calendar_sync_enabled')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    setGoogleProfile({
                        email: data.google_user_email,
                        syncEnabled: data.calendar_sync_enabled ?? false,
                        connected: !!data.google_user_email,
                    });
                }
            });
    }, [user]);

    const handleSyncToggle = async (enabled: boolean) => {
        if (!user) return;
        setIsSyncToggling(true);
        const { error } = await supabase
            .from('professional')
            .update({ calendar_sync_enabled: enabled })
            .eq('id', user.id);
        if (!error) {
            setGoogleProfile(p => ({ ...p, syncEnabled: enabled }));
            toast.success(enabled ? 'Sincronización automática activada' : 'Sincronización automática desactivada');
        } else {
            toast.error('Error al actualizar configuración');
        }
        setIsSyncToggling(false);
    };

    const handlePullNow = async () => {
        if (!user) return;
        setIsPulling(true);
        try {
            const res = await fetch('/api/integrations/google/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profesionalId: user.id }),
            });
            const data = await res.json();
            if (res.ok) {
                const r = data.results?.[0];
                toast.success(`Sync completado — ${r?.inserted ?? 0} bloqueos importados, ${r?.deleted ?? 0} eliminados`);
            } else {
                toast.error(data.error || 'Error al sincronizar');
            }
        } catch {
            toast.error('Error de red al sincronizar');
        } finally {
            setIsPulling(false);
        }
    };

    const [team, setTeam] = useState<any[]>([]);

    useEffect(() => {
        if (isSuperAdmin) refreshTeam();
    }, [isSuperAdmin, user?.email]);

    type Sucursal = {
        id: string;
        name: string;
        address: string | null;
        phone: string | null;
        google_maps_url: string | null;
        professionals?: number;
    };

    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loadingSucursales, setLoadingSucursales] = useState(true);
    const [showNewSedeDialog, setShowNewSedeDialog] = useState(false);
    const [editingSedeId, setEditingSedeId] = useState<string | null>(null);

    // Advanced Data State
    const [tratamientos, setTratamientos] = useState<any[]>([]);
    const [obrasSociales, setObrasSociales] = useState<any[]>([]);
    const [stockItems, setStockItems] = useState<any[]>([]);
    const [loadingAdvanced, setLoadingAdvanced] = useState(false);

    // Editing State for Advanced Modals
    const [editingTreatment, setEditingTreatment] = useState<any | null>(null);
    const [editingStock, setEditingStock] = useState<any | null>(null);
    const [editingOS, setEditingOS] = useState<any | null>(null);

    // Advanced Tabs Modal States
    const [showStockModal, setShowStockModal] = useState(false);
    const [showImportStockModal, setShowImportStockModal] = useState(false);
    const [showTreatmentModal, setShowTreatmentModal] = useState(false);
    const [showOSModal, setShowOSModal] = useState(false);
    const [showImportOSModal, setShowImportOSModal] = useState(false);

    // Fetch Advanced Data (Only for metrics on initial load, rest handles natively per Tab)
    useEffect(() => {
        if ((user as any)?.clinic_id && !loadingAdvanced) {
            fetchAdvancedData();
        }
    }, [(user as any)?.clinic_id]);

    const fetchAdvancedData = async () => {
        const clinicId = (user as any)?.clinic_id;
        if (!clinicId || loadingAdvanced) return;
        
        setLoadingAdvanced(true);
        try {
            // Solo necesitamos counts ligeros para los Badges del header, el contenido profundo se carga al cambiar de Tab
            const [tRes, osRes, sRes] = await Promise.all([
                supabase.from("tratamientos").select("id", { count: "exact" }).eq("clinic_id", clinicId),
                supabase.from("clinica_obras_sociales").select("id", { count: "exact" }).eq("clinic_id", clinicId),
                supabase.from("stock").select("id", { count: "exact" }).eq("clinic_id", clinicId)
            ]);

            // Fake states just for total count since we use real Tabs for deep render
            if (tRes.count !== null) setTratamientos(Array(tRes.count).fill(null));
            if (osRes.count !== null) setObrasSociales(Array(osRes.count).fill(null));
            if (sRes.count !== null) setStockItems(Array(sRes.count).fill(null));
        } catch (err) {
            console.error("Error fetching advanced data metric counts:", err);
        } finally {
            setLoadingAdvanced(false);
        }
    };
    const [newSede, setNewSede] = useState({ name: "", address: "", phone: "" });
    const [savingSede, setSavingSede] = useState(false);

    const fetchSucursales = async () => {
        const clinicId = (user as any)?.clinic_id;
        if (!clinicId) {
            setLoadingSucursales(false);
            return;
        }

        try {
            setLoadingSucursales(true);
            
            const { data, error } = await supabase
                .from("sucursal")
                .select("id, name, address, phone, google_maps_url, location, email, aclaraciones, horarios")
                .eq("clinic_id", clinicId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            
            if (data) {
                setSucursales(data.map((s: any) => ({ ...s, professionals: undefined })));
            }
        } catch (err: any) {
            console.error("Error fetching sucursales:", err);
            toast.error("Error al cargar las sedes. Verifique su conexión.");
        } finally {
            setLoadingSucursales(false);
        }
    };

    useEffect(() => {
        // Fetch as soon as clinic_id is present, don't wait for auth-provider's global 'loading'

        // which might be true during minor re-validations.
        if ((user as any)?.clinic_id) {
            fetchSucursales();
        } else if (!loading) {
            // If auth finished and still no clinic_id, stop loading
            setLoadingSucursales(false);
        }
    }, [(user as any)?.clinic_id, loading]);

    const handleSaveSede = async () => {
        if (!(user as any)?.clinic_id || !newSede.name.trim()) return;
        setSavingSede(true);
        try {
            if (editingSedeId) {
                // UPDATE
                const { data, error } = await supabase
                    .from("sucursal")
                    .update({
                        name: newSede.name,
                        address: newSede.address || null,
                        phone: newSede.phone || null
                    })
                    .eq("id", editingSedeId)
                    .select("id, name, address, phone, google_maps_url")
                    .single();

                if (error) {
                    toast.error("Error al actualizar la sede: " + error.message);
                } else if (data) {
                    setSucursales(prev => prev.map(s => s.id === editingSedeId ? { ...s, ...data } : s));
                    setShowNewSedeDialog(false);
                    setEditingSedeId(null);
                    setNewSede({ name: "", address: "", phone: "" });
                    toast.success("¡Sede actualizada correctamente!");
                }
            } else {
                // CREATE
                const { data, error } = await supabase
                    .from("sucursal")
                    .insert({ clinic_id: (user as any).clinic_id, name: newSede.name, address: newSede.address || null, phone: newSede.phone || null })
                    .select("id, name, address, phone, google_maps_url")
                    .single();

                if (error) {
                    toast.error("Error al guardar la sede: " + error.message);
                } else if (data) {
                    setSucursales(prev => [...prev, { ...data, professionals: 0 }]);
                    setShowNewSedeDialog(false);
                    setNewSede({ name: "", address: "", phone: "" });
                    toast.success("¡Sede creada correctamente!");
                }
            }
        } catch (err: any) {
            toast.error("Ocurrió un error inesperado al guardar.");
            console.error(err);
        } finally {
            setSavingSede(false);
        }
    };

    const handleDeleteSede = async () => {
        if (!editingSedeId) return;
        if (!confirm("¿Estás seguro de que deseas eliminar esta sede? Esta acción no se puede deshacer.")) return;

        setSavingSede(true);
        try {
            const { error } = await supabase
                .from("sucursal")
                .delete()
                .eq("id", editingSedeId);

            if (error) {
                toast.error("Error al eliminar la sede: " + error.message);
            } else {
                setSucursales(prev => prev.filter(s => s.id !== editingSedeId));
                setShowNewSedeDialog(false);
                setEditingSedeId(null);
                setNewSede({ name: "", address: "", phone: "" });
                toast.success("Sede eliminada correctamente");
            }
        } catch (err: any) {
            toast.error("Ocurrió un error inesperado al eliminar.");
            console.error(err);
        } finally {
            setSavingSede(false);
        }
    };

    const refreshTeam = async () => {
        const clinicId = (user as any)?.clinic_id;
        const result = await getTeamMembers(clinicId, user?.id);
        if (result.success) {
            const currentEmail = user?.email;
            const members = (result.data || []).map((m: any) => ({
                ...m,
                isCurrentUser: m.email === currentEmail
            }));
            setTeam(members);
        }
    };

    // Ultra-Fast Rendering Strategy:
    // 1. If we have a user (even without profile yet), show the page structure immediately.
    // 2. Only show a full page loader if we are truly "loading" the initial session.
    const isInitialSessionLoading = loading;

    if (isInitialSessionLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#76D7B6]" />
            </div>
        );
    }

    // If we reached here and still have no user, show Access Restricted
    if (!user && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <ShieldCheck className="h-12 w-12 text-slate-300" />
                <h2 className="text-xl font-semibold text-slate-900">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-xs">No se encontró una sesión válida. Por favor, inicia sesión para acceder a la configuración.</p>
                <Button onClick={() => window.location.href = '/'}>Ir al Inicio</Button>
            </div>
        );
    }

    const handleDeleteMember = async (id: string) => {
        const result = await deleteMember(id);
        if (result.success) {
            setTeam(team.filter(m => m.id !== id));
            toast.success("Miembro eliminado correctamente");
        } else {
            // Mock delete anyway if the action fails due to missing keys (for demo purposes)
            setTeam(team.filter(m => m.id !== id));
            toast.info("Miembro removido de vista (Modo Demo)");
        }
    };

    const handleUpdateRole = async (id: string, newRole: string) => {
        const result = await updateMemberRole(id, newRole);
        if (result.success) {
            setTeam(team.map(m => m.id === id ? { ...m, role: newRole } : m));
            toast.success("Rol actualizado");
        } else {
            // Mock update anyway for demo
            setTeam(team.map(m => m.id === id ? { ...m, role: newRole } : m));
            toast.info("Rol actualizado (Modo Demo)");
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'superadmin':
                return <Badge className="bg-[#76D7B6] hover:bg-[#76D7B6] text-slate-900 border-none gap-1 font-bold text-[10px]"><Crown className="h-3 w-3" /> Dueño</Badge>;
            case 'recepcionista':
                return <Badge className="bg-blue-500 hover:bg-blue-500 text-white border-none gap-1 font-bold text-[10px]"><MessageSquare className="h-3 w-3" /> Recepción</Badge>;
            case 'profesional':
                return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-none gap-1 font-bold text-[10px]"><Stethoscope className="h-3 w-3" /> Dentista</Badge>;
            default:
                return role;
        }
    }

    const showTrialBadge = (user as any)?.subscription_status === 'trialing' || (user?.role === 'superadmin' && !(user as any)?.subscription_status);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración</h1>
                <p className="text-slate-500 text-sm">Gestiona la información de tu clínica y equipo de trabajo.</p>
            </div>

            <Tabs defaultValue="clinica" className="w-full">
                <TabsList className={cn(
                    "grid w-full bg-slate-100 p-1",
                    isSuperAdmin ? "grid-cols-6" : "grid-cols-5"
                )}>
                    <TabsTrigger value="clinica" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Mi Clínica</TabsTrigger>
                    {isSuperAdmin && (
                        <TabsTrigger value="equipo" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Equipo</TabsTrigger>
                    )}
                    <TabsTrigger value="tratamientos" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Tratamientos</TabsTrigger>
                    <TabsTrigger value="obras-sociales" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Obras Sociales</TabsTrigger>
                    <TabsTrigger value="inventario" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Inventario</TabsTrigger>
                    <TabsTrigger value="integraciones" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Integraciones</TabsTrigger>
                </TabsList>

                <TabsContent value="clinica" className="mt-6 space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-6">
                            <ClinicConfigForm sucursales={sucursales} />

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <MapPin className="h-5 w-5 text-[#76D7B6]" />
                                            Sucursales
                                        </CardTitle>
                                        {isSuperAdmin && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1 border-[#76D7B6] text-[#76D7B6] hover:bg-[#76D7B6]/10"
                                                onClick={() => setShowNewSedeDialog(true)}
                                            >
                                                <Plus className="h-4 w-4" /> Nueva Sede
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loadingSucursales ? (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {[1, 2].map((i) => (
                                                <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse h-28" />
                                            ))}
                                        </div>
                                    ) : sucursales.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                <MapPin className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-900">No hay sedes registradas todavía</p>
                                                <p className="text-xs text-slate-500 max-w-[200px]">Agrega tu primera sucursal para comenzar a gestionar los horarios y turnos.</p>
                                            </div>
                                            {isSuperAdmin && (
                                                <Button
                                                    size="sm"
                                                    className="mt-2 bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8] font-bold"
                                                    onClick={() => setShowNewSedeDialog(true)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1" /> Agregar primera sede
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {sucursales.map((suc) => (
                                                <div
                                                    key={suc.id}
                                                    className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-[#76D7B6]/30 transition-all cursor-pointer group/sede flex items-center gap-4"
                                                    onClick={() => {
                                                        setEditingSedeId(suc.id);
                                                        setNewSede({ ...suc as any });
                                                        setShowNewSedeDialog(true);
                                                    }}
                                                >
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover/sede:bg-[#76D7B6]/10 transition-colors">
                                                        <MapPin className="h-5 w-5 text-slate-400 group-hover/sede:text-[#76D7B6]" />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="font-bold text-sm text-slate-900 truncate">{suc.name}</p>
                                                            <div className="w-1 h-1 rounded-full bg-green-500" />
                                                            <span className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Activa</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                                            {suc.address || <span className="italic text-slate-300">Sin dirección</span>}
                                                            {suc.phone && (
                                                                <>
                                                                    <span className="text-slate-300 mx-1">•</span>
                                                                    <span>{suc.phone}</span>
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {suc.google_maps_url && (
                                                            <a
                                                                href={suc.google_maps_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#76D7B6] hover:bg-[#76D7B6]/10 transition-all"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Ver en Google Maps"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                        {isSuperAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-[11px] text-[#76D7B6] hover:text-[#65cba8] hover:bg-[#76D7B6]/5 font-bold"
                                                            >
                                                                Editar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            {isSuperAdmin && showTrialBadge && (
                                <Card className={cn(
                                    "text-white border-none shadow-xl overflow-hidden relative transition-colors duration-500",
                                    daysLeft > 0 && daysLeft <= 3
                                        ? "bg-gradient-to-br from-red-950 to-red-900 ring-1 ring-red-500/30"
                                        : daysLeft <= 0
                                            ? "bg-slate-950 opacity-80"
                                            : "bg-slate-900"
                                )}>
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <ShieldCheck className="h-24 w-24 text-[#76D7B6]" />
                                    </div>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Crown className={cn(
                                                "h-4 w-4",
                                                daysLeft <= 3 ? "text-red-400" : "text-[#76D7B6]"
                                            )} />
                                            Suscripción Premium
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 relative z-10">
                                        <div className="space-y-4">
                                            {(user as any)?.clinic_created_at && (
                                                <div className="flex justify-between text-[11px] font-medium text-slate-400">
                                                    <span>Fecha de registro</span>
                                                    <span>{DateTime.fromISO((user as any).clinic_created_at).setLocale('es').toFormat('dd/MM/yyyy')}</span>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-slate-400">Días de prueba</span>
                                                    <span className={cn(
                                                        "font-bold",
                                                        daysLeft <= 3 ? "text-red-400 animate-pulse" : "text-[#76D7B6]"
                                                    )}>{daysLeft} restantes</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000",
                                                            daysLeft <= 3 ? "bg-red-500 animate-pulse-slow" : "bg-[#76D7B6] animate-pulse-slow"
                                                        )}
                                                        style={{ width: `${trialProgress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-2 text-xs text-slate-300">
                                                <Plus className="h-3 w-3 mt-0.5 text-[#76D7B6]" />
                                                Pacientes ilimitados
                                            </div>
                                            <div className="flex items-start gap-2 text-xs text-slate-300">
                                                <Plus className="h-3 w-3 mt-0.5 text-[#76D7B6]" />
                                                Soporte prioritario
                                            </div>
                                        </div>
                                         <Button 
                                              size="sm"
                                              className="w-full bg-white text-slate-900 hover:bg-[#76D7B6] hover:text-white transition-all font-bold group/btn h-9"
                                              onClick={() => {
                                                  window.location.href = '/#pricing';
                                              }}
                                          >
                                              <span className="group-hover/btn:scale-105 transition-transform text-xs">PASAR A PRO</span>
                                          </Button>
                                     </CardContent>
                                 </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="equipo" className="mt-6 space-y-6 data-[state=inactive]:hidden" forceMount>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Equipo ({team.length} {team.length === 1 ? 'miembro' : 'miembros'})
                        </h2>
                    </div>

                    <SimpleTeamTable 
                        members={team}
                        onDelete={handleDeleteMember}
                        onUpdateRole={handleUpdateRole}
                        onInviteSent={refreshTeam}
                    />

                    <AddMemberFAB onInviteSent={refreshTeam} />
                </TabsContent>

                <TabsContent value="tratamientos" className="mt-6 data-[state=inactive]:hidden" forceMount>
                    <TratamientosTab clinicId={(user as any)?.clinic_id || ""} />
                </TabsContent>

                <TabsContent value="obras-sociales" className="mt-6 data-[state=inactive]:hidden" forceMount>
                    <ObrasSocialesTab clinicId={(user as any)?.clinic_id || ""} />
                </TabsContent>

                <TabsContent value="inventario" className="mt-6 data-[state=inactive]:hidden" forceMount>
                    <InventarioTab clinicId={(user as any)?.clinic_id || ""} />
                </TabsContent>

                {/* ─── Integraciones Tab ─────────────────────────────────────── */}
                <TabsContent value="integraciones" className="mt-6 space-y-6 data-[state=inactive]:hidden" forceMount>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CalendarDays className="h-5 w-5 text-[#76D7B6]" />
                                Google Calendar
                            </CardTitle>
                            <CardDescription>
                                Sincronizá tus turnos con Google Calendar y visualizá tus eventos externos como bloqueos en la agenda.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Connection status */}
                            <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-50">
                                <div className="flex items-center gap-3">
                                    {googleProfile.connected ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-slate-300" />
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {googleProfile.connected ? 'Cuenta conectada' : 'Sin conexión'}
                                        </p>
                                        {googleProfile.email && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <LinkIcon className="h-3 w-3" /> {googleProfile.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleConnectGoogle}
                                    className="gap-2 border-[#76D7B6] text-[#76D7B6] hover:bg-[#76D7B6]/10"
                                >
                                    <CalendarDays className="h-4 w-4" />
                                    {googleProfile.connected ? 'Reconectar' : 'Conectar Google Calendar'}
                                </Button>
                            </div>

                            {/* Sync toggle */}
                            {googleProfile.connected && (
                                <div className="flex items-center justify-between p-4 rounded-xl border">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Sincronización automática</p>
                                        <p className="text-xs text-slate-500">Los turnos nuevos se crearán automáticamente en tu Google Calendar.</p>
                                    </div>
                                    <button
                                        onClick={() => handleSyncToggle(!googleProfile.syncEnabled)}
                                        disabled={isSyncToggling}
                                        className={cn(
                                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                                            googleProfile.syncEnabled ? 'bg-[#76D7B6]' : 'bg-slate-200'
                                        )}
                                    >
                                        <span className={cn(
                                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                                            googleProfile.syncEnabled ? 'translate-x-6' : 'translate-x-1'
                                        )} />
                                    </button>
                                </div>
                            )}

                            {/* Manual pull sync */}
                            {googleProfile.connected && (
                                <div className="flex items-center justify-between p-4 rounded-xl border">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Importar eventos ahora</p>
                                        <p className="text-xs text-slate-500">Importá eventos de Google Calendar como bloqueos en la agenda (próximos 30 días).</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePullNow}
                                        disabled={isPulling}
                                        className="gap-2"
                                    >
                                        {isPulling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                        Sincronizar
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >

            <SedeModal
                isOpen={showNewSedeDialog}
                onClose={() => {
                    setShowNewSedeDialog(false);
                    setEditingSedeId(null);
                    setNewSede({ name: "", address: "", phone: "" });
                }}
                editingSede={editingSedeId ? { id: editingSedeId, ...newSede } : null}
                clinicId={(user as any)?.clinic_id || ""}
                onSuccess={(data, isEdit) => {
                    if (!isEdit && typeof data === 'string') {
                        // Deletion case handled by onSuccess passing ID (simple restoration logic)
                        setSucursales(prev => prev.filter(s => s.id !== data));
                    } else {
                        // Success handled by local fetch in useEffect [loading] or manual refresh
                        // For responsiveness, we can manually trigger refreshSucursales if we possessed it
                        // but the existing useEffect [user?.clinic_id, loading] will trigger on data changes if handled correctly.
                        // However, to be safe and immediate:
                        if (isEdit) {
                            setSucursales(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s));
                        } else {
                            setSucursales(prev => [...prev, data]);
                        }
                    }
                }}
            />


            <StockModal
                isOpen={showStockModal}
                onClose={() => setShowStockModal(false)}
                editingItem={editingStock}
                clinicId={(user as any)?.clinic_id || ""}
                onSuccess={fetchAdvancedData}
            />

            <ImportStockModal
                isOpen={showImportStockModal}
                onClose={() => setShowImportStockModal(false)}
                clinicId={(user as any)?.clinic_id || ""}
                onSuccess={fetchAdvancedData}
            />

            <ObrasSocialesModal 
                isOpen={showOSModal}
                onClose={() => setShowOSModal(false)}
                editingItem={editingOS}
                clinicId={(user as any)?.clinic_id || ""}
                onSuccess={fetchAdvancedData}
            />

            <ImportObrasSocialesModal
                isOpen={showImportOSModal}
                onClose={() => setShowImportOSModal(false)}
                clinicId={(user as any)?.clinic_id || ""}
                onSuccess={fetchAdvancedData}
            />
        </div >
    );
}
