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

export default function ConfigPage() {
    const { user, loading } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    const [clinicData, setClinicData] = useState({
        name: "Consultorios Dentales Livio",
        cuit: "20-12345678-9",
        email: "admin@livio.com",
        phone: "+54 11 4567-8900",
    });


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

    const sucursales = [
        { id: 1, name: "Sede Central", address: "Av. Corrientes 1234, CABA", phone: "+54 11 4567-8900", professionals: 3, active: true },
        { id: 2, name: "Sede Palermo", address: "Honduras 4500, CABA", phone: "+54 11 4567-8901", professionals: 2, active: true },
    ];

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
                                            <Input id="clinic-name" value={clinicData.name} onChange={(e) => setClinicData({ ...clinicData, name: e.target.value })} disabled={!isSuperAdmin} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="clinic-cuit">CUIT</Label>
                                            <Input id="clinic-cuit" value={clinicData.cuit} onChange={(e) => setClinicData({ ...clinicData, cuit: e.target.value })} disabled={!isSuperAdmin} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="clinic-email">Email Admin</Label>
                                            <Input id="clinic-email" type="email" value={clinicData.email} onChange={(e) => setClinicData({ ...clinicData, email: e.target.value })} disabled={!isSuperAdmin} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="clinic-phone">Teléfono Consultas</Label>
                                            <Input id="clinic-phone" value={clinicData.phone} onChange={(e) => setClinicData({ ...clinicData, phone: e.target.value })} disabled={!isSuperAdmin} />
                                        </div>
                                    </div>
                                    {isSuperAdmin && <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-white">Guardar Cambios</Button>}
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
                                            <Button variant="outline" size="sm" className="gap-1 border-[#76D7B6] text-[#76D7B6] hover:bg-[#76D7B6]/10">
                                                <Plus className="h-4 w-4" /> Nueva Sede
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {sucursales.map((suc) => (
                                            <div key={suc.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-[#76D7B6]/30 transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="font-bold text-slate-900">{suc.name}</p>
                                                    <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 border-none">Activa</Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {suc.address}
                                                </p>
                                                <div className="flex items-center gap-3 border-t pt-3 mt-1">
                                                    <span className="text-[11px] text-[#76D7B6] font-medium">{suc.professionals} Profesionales</span>
                                                    <Button variant="link" className="h-auto p-0 text-[11px] text-slate-400">Editar</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            {isSuperAdmin && (
                                <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <ShieldCheck className="h-24 w-24 text-[#76D7B6]" />
                                    </div>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Crown className="h-4 w-4 text-[#76D7B6]" />
                                            Suscripción Premium
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6 relative z-10">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-slate-400">Días de prueba</span>
                                                <span className="text-[#76D7B6]">14 restantes</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#76D7B6] w-full animate-pulse-slow"></div>
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
