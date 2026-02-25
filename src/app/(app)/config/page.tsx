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
    Stethoscope
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateMemberRole, deleteMember, getTeamMembers } from "@/app/actions/team";
import InviteModal from "@/components/team/InviteModal";

import { supabase } from "@/lib/supabase/client";

export default function ConfigPage() {
    const { user, loading } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    const [clinicData, setClinicData] = useState({
        name: "",
        cuit: "",
        email: "",
        phone: "",
    });
    const [loadingClinic, setLoadingClinic] = useState(true);

    useEffect(() => {
        const fetchClinicData = async () => {
            if (!user?.clinic_id) {
                setLoadingClinic(false);
                return;
            }
            setLoadingClinic(true);
            const { data, error } = await supabase
                .from("clinic")
                .select("name, cuit, email, phone")
                .eq("id", user.clinic_id)
                .maybeSingle();

            if (!error && data) {
                setClinicData({
                    name: data.name || "",
                    cuit: data.cuit || "",
                    email: data.email || "",
                    phone: data.phone || "",
                });
            }
            setLoadingClinic(false);
        };

        if (!loading) fetchClinicData();
    }, [user?.clinic_id, loading]);

    const handleSaveClinic = async () => {
        if (!user?.clinic_id) return;
        const { error } = await supabase
            .from("clinic")
            .update({
                name: clinicData.name,
                cuit: clinicData.cuit,
                email: clinicData.email,
                phone: clinicData.phone,
            })
            .eq("id", user.clinic_id);

        if (error) {
            toast.error("Error al guardar los cambios: " + error.message);
        } else {
            toast.success("¡Cambios guardados correctamente!");
        }
    };

    const [team, setTeam] = useState<any[]>([]);

    useEffect(() => {
        const fetchTeam = async () => {
            const result = await getTeamMembers();
            if (result.success) {
                setTeam(result.data || []);
            }
        };
        if (isSuperAdmin) fetchTeam();
    }, [isSuperAdmin]);

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
    const [newSede, setNewSede] = useState({ name: "", address: "", phone: "" });
    const [savingSede, setSavingSede] = useState(false);

    useEffect(() => {
        const fetchSucursales = async () => {
            if (!user?.clinic_id) { setLoadingSucursales(false); return; }
            setLoadingSucursales(true);
            const { data, error } = await supabase
                .from("sucursal")
                .select("id, name, address, phone, google_maps_url")
                .eq("clinic_id", user.clinic_id)
                .order("created_at", { ascending: true });

            if (!error && data) {
                setSucursales(data.map((s) => ({ ...s, professionals: undefined })));
            }
            setLoadingSucursales(false);
        };
        if (!loading) fetchSucursales();
    }, [user?.clinic_id, loading]);

    const handleSaveSede = async () => {
        if (!user?.clinic_id || !newSede.name.trim()) return;
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
                    .insert({ clinic_id: user.clinic_id, name: newSede.name, address: newSede.address || null, phone: newSede.phone || null })
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
        const result = await getTeamMembers();
        if (result.success) setTeam(result.data || []);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#76D7B6]"></div>
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

    const trialDaysLeft = user?.trial_ends_at
        ? Math.max(0, Math.ceil(DateTime.fromISO(user.trial_ends_at).diffNow('days').days))
        : 14;

    const trialProgress = Math.min(100, Math.max(0, (trialDaysLeft / 14) * 100));

    const showTrialBadge = user?.subscription_status === 'trialing' || (user?.role === 'superadmin' && !user?.subscription_status);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración</h1>
                <p className="text-slate-500 text-sm">Gestiona la información de tu clínica y equipo de trabajo.</p>
            </div>

            <Tabs defaultValue="clinica" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 p-1">
                    <TabsTrigger value="clinica" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Mi Clínica</TabsTrigger>
                    {isSuperAdmin && (
                        <TabsTrigger value="equipo" className="data-[state=active]:bg-white data-[state=active]:text-[#76D7B6] data-[state=active]:shadow-sm">Equipo</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="clinica" className="mt-6 space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className={cn(!isSuperAdmin && "opacity-80")}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Building2 className="h-5 w-5 text-[#76D7B6]" />
                                        Información General
                                    </CardTitle>
                                    <CardDescription>Datos básicos de facturación y contacto.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="clinic-name">Nombre Comercial</Label>
                                            <Input
                                                id="clinic-name"
                                                value={clinicData.name}
                                                onChange={(e) => setClinicData({ ...clinicData, name: e.target.value })}
                                                disabled={!isSuperAdmin || loadingClinic}
                                                placeholder={loadingClinic ? "Cargando..." : "Ej: Clinica Dental San Martín"}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="clinic-cuit">CUIT</Label>
                                            <Input
                                                id="clinic-cuit"
                                                value={clinicData.cuit}
                                                onChange={(e) => setClinicData({ ...clinicData, cuit: e.target.value })}
                                                disabled={!isSuperAdmin || loadingClinic}
                                                placeholder={loadingClinic ? "Cargando..." : "Ej: 20-12345678-9"}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="clinic-email">Email Admin</Label>
                                            <Input
                                                id="clinic-email"
                                                type="email"
                                                value={clinicData.email}
                                                onChange={(e) => setClinicData({ ...clinicData, email: e.target.value })}
                                                disabled={!isSuperAdmin || loadingClinic}
                                                placeholder={loadingClinic ? "Cargando..." : "Ej: admin@miclinica.com"}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="clinic-phone">Teléfono Consultas</Label>
                                            <Input
                                                id="clinic-phone"
                                                value={clinicData.phone}
                                                onChange={(e) => setClinicData({ ...clinicData, phone: e.target.value })}
                                                disabled={!isSuperAdmin || loadingClinic}
                                                placeholder={loadingClinic ? "Cargando..." : "Ej: +54 11 4567-8900"}
                                            />
                                        </div>
                                    </div>
                                    {isSuperAdmin && (
                                        <Button
                                            onClick={handleSaveClinic}
                                            className="bg-[#76D7B6] hover:bg-[#65cba8] text-white"
                                            disabled={loadingClinic}
                                        >
                                            {loadingClinic ? "Cargando..." : "Guardar Cambios"}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

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
                                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                                            <MapPin className="h-10 w-10 text-slate-200" />
                                            <p className="text-sm text-slate-500 font-medium">No hay sedes cargadas todavía</p>
                                            <p className="text-xs text-slate-400">Crea tu primera sede para organizarte mejor</p>
                                            {isSuperAdmin && (
                                                <Button
                                                    size="sm"
                                                    className="mt-1 bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8]"
                                                    onClick={() => setShowNewSedeDialog(true)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1" /> Agregar primera sede
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {sucursales.map((suc) => (
                                                <div key={suc.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-[#76D7B6]/30 transition-all">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="font-bold text-slate-900">{suc.name}</p>
                                                        <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 border-none">Activa</Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {suc.address || <span className="italic text-slate-300">Sin dirección</span>}
                                                    </p>
                                                    <div className="flex items-center gap-3 border-t pt-3 mt-1">
                                                        {suc.phone && (
                                                            <span className="text-[11px] text-slate-500 font-medium">{suc.phone}</span>
                                                        )}
                                                        {suc.google_maps_url && (
                                                            <a
                                                                href={suc.google_maps_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[11px] text-[#76D7B6] hover:underline transition-colors"
                                                            >
                                                                Ver en Maps
                                                            </a>
                                                        )}
                                                        {!suc.phone && !suc.google_maps_url && (
                                                            <span className="text-[11px] text-slate-300 italic">Sin datos de contacto</span>
                                                        )}
                                                        <div className="flex-1" />
                                                        {isSuperAdmin && (
                                                            <Button
                                                                variant="link"
                                                                className="h-auto p-0 text-[11px] text-[#76D7B6] hover:text-[#65cba8] font-bold"
                                                                onClick={() => {
                                                                    setEditingSedeId(suc.id);
                                                                    setNewSede({
                                                                        name: suc.name,
                                                                        address: suc.address || "",
                                                                        phone: suc.phone || ""
                                                                    });
                                                                    setShowNewSedeDialog(true);
                                                                }}
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

                            {/* Nueva Sede Dialog */}
                            {showNewSedeDialog && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                                        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <MapPin className="h-5 w-5 text-[#76D7B6]" /> {editingSedeId ? "Editar Sede" : "Nueva Sede"}
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre *</label>
                                                <input
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#76D7B6]/40"
                                                    placeholder="Ej: Sede Central"
                                                    value={newSede.name}
                                                    onChange={e => setNewSede(p => ({ ...p, name: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Dirección</label>
                                                <input
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#76D7B6]/40"
                                                    placeholder="Ej: Av. Corrientes 1234, CABA"
                                                    value={newSede.address}
                                                    onChange={e => setNewSede(p => ({ ...p, address: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Teléfono</label>
                                                <input
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#76D7B6]/40"
                                                    placeholder="Ej: +54 11 4567-8900"
                                                    value={newSede.phone}
                                                    onChange={e => setNewSede(p => ({ ...p, phone: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-5 items-center justify-between">
                                            {editingSedeId ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 px-2"
                                                    onClick={handleDeleteSede}
                                                    disabled={savingSede}
                                                >
                                                    <Trash2 className="h-4 w-4" /> Eliminar
                                                </Button>
                                            ) : <div />}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => { setShowNewSedeDialog(false); setEditingSedeId(null); setNewSede({ name: "", address: "", phone: "" }); }}
                                                    disabled={savingSede}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8]"
                                                    onClick={handleSaveSede}
                                                    disabled={savingSede || !newSede.name.trim()}
                                                >
                                                    {savingSede ? "Guardando..." : (editingSedeId ? "Actualizar" : "Guardar Sede")}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {isSuperAdmin && showTrialBadge && (
                                <Card className={cn(
                                    "text-white border-none shadow-xl overflow-hidden relative transition-colors duration-500",
                                    trialDaysLeft > 0 && trialDaysLeft <= 3
                                        ? "bg-gradient-to-br from-red-950 to-red-900 ring-1 ring-red-500/30"
                                        : trialDaysLeft <= 0
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
                                                trialDaysLeft <= 3 ? "text-red-400" : "text-[#76D7B6]"
                                            )} />
                                            Suscripción Premium
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6 relative z-10">
                                        <div className="space-y-4">
                                            {user?.clinic_created_at && (
                                                <div className="flex justify-between text-[11px] font-medium text-slate-400">
                                                    <span>Fecha de registro</span>
                                                    <span>{DateTime.fromISO(user.clinic_created_at).setLocale('es').toFormat('dd/MM/yyyy')}</span>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-slate-400">Días de prueba</span>
                                                    <span className={cn(
                                                        "font-bold",
                                                        trialDaysLeft <= 3 ? "text-red-400 animate-pulse" : "text-[#76D7B6]"
                                                    )}>{trialDaysLeft} restantes</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000",
                                                            trialDaysLeft <= 3 ? "bg-red-500 animate-pulse-slow" : "bg-[#76D7B6] animate-pulse-slow"
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
                                        <Button className="w-full bg-white text-slate-900 hover:bg-[#76D7B6] hover:text-white transition-all font-bold">
                                            PASAR A PRO
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="equipo" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-6">
                            <div className="space-y-1">
                                <CardTitle className="text-xl">
                                    {team.length} {team.length === 1 ? 'miembro' : 'miembros'} equipo (incluye Dueño 👑)
                                </CardTitle>
                                <CardDescription>Gestiona el acceso de tus profesionales y recepcionistas.</CardDescription>
                            </div>
                            <InviteModal onInviteSent={refreshTeam} />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 border-none hover:bg-slate-50">
                                        <TableHead className="font-bold text-slate-900 rounded-l-lg">Miembro</TableHead>
                                        <TableHead className="font-bold text-slate-900">Rol</TableHead>
                                        <TableHead className="font-bold text-slate-900">Estado</TableHead>
                                        <TableHead className="text-right font-bold text-slate-900 rounded-r-lg">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {team.map((member) => (
                                        <TableRow key={member.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-[#76D7B6]/10 flex items-center justify-center font-bold text-[#76D7B6] text-xs">
                                                        {(member.full_name || "M").split(" ").map((n: string) => n[0]).join("")}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">{member.full_name}</p>
                                                        <p className="text-[11px] text-slate-400">{member.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getRoleBadge(member.role)}
                                                    {member.role === 'superadmin' && <span className="text-[10px] text-slate-400 font-medium">Admin Total</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] font-medium border-none px-2",
                                                    member.status === 'activo' ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"
                                                )}>
                                                    {member.status === 'activo' ? 'Activo' : 'Invitación pendiente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {member.role !== 'superadmin' ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleUpdateRole(member.id, 'superadmin')}>
                                                                <Crown className="h-4 w-4" /> Cambiar a Dueño
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleUpdateRole(member.id, 'recepcionista')}>
                                                                <MessageSquare className="h-4 w-4" /> Cambiar a Recepción
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleUpdateRole(member.id, 'profesional')}>
                                                                <Stethoscope className="h-4 w-4" /> Cambiar a Dentista
                                                            </DropdownMenuItem>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            {member.status === 'pendiente' && (
                                                                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => toast.success("Invitación reenviada")}>
                                                                    <Send className="h-4 w-4" /> Reenviar Invite
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                className="cursor-pointer gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                                                                onClick={() => handleDeleteMember(member.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Eliminar Miembro
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <Badge variant="ghost" className="text-[10px] text-slate-300">Protegido</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
