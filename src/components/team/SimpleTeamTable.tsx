"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, Mail, Crown, ShieldCheck, Stethoscope, MessageSquare, Users, Plus } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import InviteModal from "./InviteModal";

interface Member {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    isCurrentUser?: boolean;
}

interface SimpleTeamTableProps {
    members: Member[];
    onDelete: (id: string) => void;
    onUpdateRole: (id: string, role: string) => void;
    onInviteSent?: () => void;
}

export function SimpleTeamTable({ members, onDelete, onUpdateRole, onInviteSent }: SimpleTeamTableProps) {
    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'superadmin':
            case 'Dueño':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none gap-1 font-bold text-[10px]"><Crown className="h-3 w-3" /> Dueño</Badge>;
            case 'recepcionista':
            case 'Recepción':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none gap-1 font-bold text-[10px]"><MessageSquare className="h-3 w-3" /> Recepción</Badge>;
            case 'profesional':
            case 'Dentista':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none gap-1 font-bold text-[10px]"><Stethoscope className="h-3 w-3" /> Dentista</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        const isActive = status === 'activo' || status === 'active';
        return (
            <Badge variant="outline" className={cn(
                "text-[10px] font-medium border-none px-2",
                isActive ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"
            )}>
                {isActive ? 'Activo' : 'Pendiente'}
            </Badge>
        );
    };

    return (
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/50 border-none hover:bg-slate-50/50">
                        <TableHead className="font-bold text-slate-900 pl-6">Nombre</TableHead>
                        <TableHead className="font-bold text-slate-900">Rol</TableHead>
                        <TableHead className="font-bold text-slate-900">Estado</TableHead>
                        <TableHead className="text-right font-bold text-slate-900 pr-10">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.map((member) => (
                        <TableRow key={member.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                            <TableCell className="pl-6">
                                <div>
                                    <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                        {member.full_name}
                                        {member.isCurrentUser && (
                                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md border border-amber-100 font-bold uppercase tracking-tighter">
                                                Tú
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Mail className="h-2.5 w-2.5" /> {member.email}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell>
                                {getRoleBadge(member.role)}
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(member.status)}
                            </TableCell>
                            <TableCell className="text-right pr-10">
                                {member.isCurrentUser ? (
                                    <Badge variant="ghost" className="text-[10px] text-slate-300 gap-1">
                                        <ShieldCheck className="h-3 w-3" /> Fijo
                                    </Badge>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onUpdateRole(member.id, 'superadmin')}>
                                                <Crown className="h-4 w-4 text-amber-500" /> Dueño
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onUpdateRole(member.id, 'recepcionista')}>
                                                <MessageSquare className="h-4 w-4 text-blue-500" /> Recepción
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onUpdateRole(member.id, 'profesional')}>
                                                <Stethoscope className="h-4 w-4 text-emerald-500" /> Dentista
                                            </DropdownMenuItem>
                                            <div className="h-px bg-slate-100 my-1" />
                                            <DropdownMenuItem 
                                                className="gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                                onClick={() => onDelete(member.id)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    
                    {members.length === 1 && members[0].isCurrentUser && (
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell colSpan={4} className="py-20 text-center">
                                <div className="flex flex-col items-center justify-center max-w-[300px] mx-auto gap-4">
                                    <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center animate-bounce-slow">
                                        <Users className="h-8 w-8 text-[#10B981]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-900 text-lg">Tu equipo está listo para crecer</p>
                                        <p className="text-xs text-slate-500 leading-relaxed max-w-[250px] mx-auto">
                                            Aún estás solo en la clínica. Invita a tus colegas o asistentes para centralizar la gestión hoy mismo.
                                        </p>
                                    </div>
                                    <div className="pt-2">
                                        <InviteModal 
                                            onInviteSent={onInviteSent} 
                                            trigger={
                                                <Button className="bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm h-11 px-8 rounded-2xl gap-2 shadow-xl shadow-emerald-200 transition-all hover:scale-105 active:scale-95">
                                                    <Plus className="h-4 w-4" /> Comenzar a formar equipo
                                                </Button>
                                            }
                                        />
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}

                    {/* Footer summary */}
                    <TableRow className="border-none bg-slate-50/20">
                         <TableCell colSpan={4} className="py-4 text-center">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-300">
                                {members.length === 1 ? 'Solo tú en el equipo' : `${members.length} Miembros totales`}
                            </p>
                         </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
