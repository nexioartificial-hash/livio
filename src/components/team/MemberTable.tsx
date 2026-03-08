"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Search,
    Filter,
    Calendar,
    Trash2,
    UserCog,
    MapPin,
    Stethoscope,
    UserPlus,
    Send,
    Loader2,
    Clock,
} from "lucide-react";
import { MiniCalendar } from "./MiniCalendar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMember, resendInvite } from "@/app/actions/team";
import { motion, AnimatePresence } from "framer-motion";
import { MemberEditModal } from "./MemberEditModal";

interface MemberTableProps {
    data: any[];
    sucursales: any[];
    onRefresh: () => void;
}

export function MemberTable({ data, sucursales, onRefresh }: MemberTableProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [branchFilter, setBranchFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "pendiente">("all");

    const [editingMember, setEditingMember] = useState<any | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const filteredData = useMemo(() => {
        return data.filter((member) => {
            const matchesSearch =
                member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.matricula_nacional?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === "all" || member.role === roleFilter;
            const matchesBranch = branchFilter === "all" ||
                (member.sucursales && member.sucursales.includes(branchFilter));
            const matchesStatus = statusFilter === "all" || member.status === statusFilter;
            return matchesSearch && matchesRole && matchesBranch && matchesStatus;
        });
    }, [data, searchTerm, roleFilter, branchFilter, statusFilter]);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este miembro del equipo?")) return;
        setActionLoading(id);
        try {
            const res = await deleteMember(id);
            if (res.success) {
                toast.success("Miembro eliminado correctamente");
                onRefresh();
            } else {
                toast.error(res.error || "Error al eliminar miembro");
            }
        } catch {
            toast.error("Error inesperado al eliminar");
        } finally {
            setActionLoading(null);
        }
    };

    const handleResend = async (id: string) => {
        setActionLoading(id);
        try {
            const res = await resendInvite(id);
            if (res.success) {
                toast.success("Invitación reenviada correctamente");
            } else {
                toast.error("Error al reenviar invitación");
            }
        } catch {
            toast.error("Error inesperado");
        } finally {
            setActionLoading(null);
        }
    };

    const handleEdit = (member: any) => {
        if (member.status === "pendiente") {
            toast.info("No se puede editar un miembro con invitación pendiente");
            return;
        }
        setEditingMember(member);
        setIsEditOpen(true);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "superadmin":
                return <Badge className="bg-purple-100 text-purple-700 border-none font-bold text-[10px] rounded-lg shrink-0">Dueño</Badge>;
            case "professional":
            case "profesional":
                return <Badge className="bg-blue-100 text-blue-700 border-none font-bold text-[10px] rounded-lg shrink-0">Profesional</Badge>;
            case "receptionist":
            case "recepcionista":
                return <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px] rounded-lg shrink-0">Recepcionista</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px] uppercase rounded-lg shrink-0">{role}</Badge>;
        }
    };

    const ActionButtons = ({ member }: { member: any }) => (
        <div className="flex items-center justify-end gap-1 shrink-0">
            {(member.role === "professional" || member.role === "profesional") && member.status === "activo" && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Ver Agenda"
                    onClick={(e) => { e.stopPropagation(); router.push(`/agenda?profesional=${member.id}`); }}
                >
                    <Calendar className="h-4 w-4" />
                </Button>
            )}
            {member.status === "pendiente" ? (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                    title="Reenviar Invitación"
                    disabled={actionLoading === member.id}
                    onClick={(e) => { e.stopPropagation(); handleResend(member.id); }}
                >
                    {actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-400 hover:text-[#76D7B6] hover:bg-[#76D7B6]/10 rounded-xl transition-all"
                    title="Configurar Perfil"
                    onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                >
                    <UserCog className="h-4 w-4" />
                </Button>
            )}
            {member.role !== "superadmin" && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Eliminar"
                    disabled={actionLoading === member.id}
                    onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }}
                >
                    {actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
            )}
        </div>
    );

    const emptyState = (
        <div className="flex flex-col items-center gap-3 text-slate-400 py-16">
            <div className="h-16 w-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                <UserPlus className="h-8 w-8 stroke-1" />
            </div>
            <p className="text-sm font-medium">No se encontraron miembros con esos filtros</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Buscar por nombre, email o matrícula..."
                        className="pl-9 h-10 border-slate-100 bg-slate-50/50 focus:bg-white rounded-xl w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <select
                        className="h-10 px-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-600 focus:outline-none appearance-none cursor-pointer"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">Todos los Roles</option>
                        <option value="superadmin">Dueño</option>
                        <option value="professional">Profesionales</option>
                        <option value="receptionist">Recepcionistas</option>
                    </select>
                    <select
                        className="h-10 px-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-600 focus:outline-none appearance-none cursor-pointer"
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                    >
                        <option value="all">Todas las Sedes</option>
                        {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-10 rounded-xl text-xs font-bold gap-1.5 px-3 shrink-0",
                            statusFilter !== "all" ? "bg-[#76D7B6]/10 text-[#76D7B6] border border-[#76D7B6]/20" : "text-slate-500 hover:bg-slate-50"
                        )}
                        onClick={() => {
                            if (statusFilter === "all") setStatusFilter("activo");
                            else if (statusFilter === "activo") setStatusFilter("pendiente");
                            else setStatusFilter("all");
                        }}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        {statusFilter === "all" ? "Estado" : statusFilter === "activo" ? "Activos" : "Pendientes"}
                    </Button>
                </div>
            </div>

            {/* === DESKTOP TABLE (md+) === */}
            <div className="hidden md:block rounded-3xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                {/* Fixed-layout table prevents overflow */}
                <table className="w-full table-fixed">
                    <colgroup>
                        <col style={{ width: "35%" }} />
                        <col style={{ width: "25%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest py-4 pl-6 pr-3">Miembro</th>
                            <th className="text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest py-4 px-3">Info Profesional</th>
                            <th className="text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-widest py-4 px-3">Horarios</th>
                            <th className="text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-widest py-4 px-3">Producción</th>
                            <th className="text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-widest py-4 pl-3 pr-5">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>{emptyState}</td>
                                </tr>
                            ) : (
                                filteredData.map((member) => (
                                    <motion.tr
                                        key={member.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="border-b border-slate-50 hover:bg-[#76D7B6]/[0.025] transition-colors group"
                                    >
                                        {/* Miembro */}
                                        <td className="py-4 pl-6 pr-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm border border-slate-100 shrink-0">
                                                    <AvatarImage src={member.foto_url} />
                                                    <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-extrabold text-[11px] uppercase">
                                                        {(member.full_name || "M").split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <p className="font-extrabold text-[14px] text-slate-900 leading-none truncate">{member.full_name}</p>
                                                        {getRoleBadge(member.role)}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 font-medium truncate mt-1">{member.email}</p>
                                                    {member.status === "pendiente" && (
                                                        <Badge className="bg-amber-50 text-amber-600 border-none text-[9px] h-4 px-1.5 font-bold uppercase rounded-md mt-1">
                                                            <Clock className="h-2.5 w-2.5 mr-1" /> Pendiente
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Info Profesional */}
                                        <td className="py-4 px-3">
                                            <div className="space-y-1 min-w-0">
                                                {member.matricula_nacional && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 truncate">
                                                        <Stethoscope className="h-3 w-3 text-slate-300 shrink-0" />
                                                        <span className="truncate">MN: {member.matricula_nacional}</span>
                                                    </div>
                                                )}
                                                {member.specialty && (
                                                    <p className="text-[10px] font-extrabold text-[#10B981] uppercase tracking-wider truncate">{member.specialty}</p>
                                                )}
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(member.sucursales || []).slice(0, 2).map((sid: string) => {
                                                        const s = sucursales.find(suc => suc.id === sid);
                                                        return s ? (
                                                            <Badge key={sid} variant="secondary" className="bg-slate-100/50 text-slate-500 border-none text-[9px] h-4 font-bold px-1.5 rounded-md shrink-0">
                                                                <MapPin className="h-2 w-2 mr-0.5" />{s.name}
                                                            </Badge>
                                                        ) : null;
                                                    })}
                                                    {(member.sucursales || []).length > 2 && (
                                                        <Badge variant="secondary" className="bg-slate-100/50 text-slate-400 border-none text-[9px] h-4 font-bold px-1.5 rounded-md shrink-0">
                                                            +{member.sucursales.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Horarios */}
                                        <td className="py-4 px-3">
                                            <div className="flex justify-center">
                                                <MiniCalendar horarios={member.horarios} />
                                            </div>
                                        </td>
                                        {/* Producción */}
                                        <td className="py-4 px-3">
                                            <p className="font-extrabold text-[14px] text-slate-800 truncate">$ 450.000</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">Este mes</p>
                                        </td>
                                        {/* Acciones */}
                                        <td className="py-4 pl-3 pr-5">
                                            <ActionButtons member={member} />
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {/* === MOBILE CARDS (< md) === */}
            <div className="md:hidden space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredData.length === 0 ? (
                        <div className="rounded-3xl border border-slate-100 bg-white">{emptyState}</div>
                    ) : (
                        filteredData.map((member) => (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm border border-slate-100 shrink-0">
                                            <AvatarImage src={member.foto_url} />
                                            <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-extrabold text-[12px] uppercase">
                                                {(member.full_name || "M").split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-extrabold text-[15px] text-slate-900 truncate">{member.full_name}</p>
                                                {getRoleBadge(member.role)}
                                            </div>
                                            <p className="text-[12px] text-slate-400 truncate">{member.email}</p>
                                            {member.status === "pendiente" && (
                                                <Badge className="bg-amber-50 text-amber-600 border-none text-[9px] h-4 px-1.5 font-bold uppercase rounded-md mt-1">
                                                    <Clock className="h-2.5 w-2.5 mr-1" /> Invitación Pendiente
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <ActionButtons member={member} />
                                </div>

                                {/* Secondary info row */}
                                {(member.specialty || member.matricula_nacional || (member.sucursales?.length > 0)) && (
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-2">
                                        {member.specialty && (
                                            <span className="text-[10px] font-extrabold text-[#10B981] uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-lg">
                                                {member.specialty}
                                            </span>
                                        )}
                                        {member.matricula_nacional && (
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                                <Stethoscope className="h-3 w-3" /> MN: {member.matricula_nacional}
                                            </span>
                                        )}
                                        {(member.sucursales || []).slice(0, 3).map((sid: string) => {
                                            const s = sucursales.find(suc => suc.id === sid);
                                            return s ? (
                                                <Badge key={sid} variant="secondary" className="bg-slate-100/50 text-slate-500 border-none text-[9px] font-bold px-2 rounded-lg">
                                                    <MapPin className="h-2.5 w-2.5 mr-1" />{s.name}
                                                </Badge>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Edit Modal */}
            {editingMember && (
                <MemberEditModal
                    member={editingMember}
                    sucursales={sucursales}
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    );
}
