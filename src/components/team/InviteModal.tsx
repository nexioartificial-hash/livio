"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Send,
    RefreshCw,
    X,
    Clock,
    CheckCircle2,
    XCircle,
    Users,
    Crown,
    Stethoscope,
    MessageSquare,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import {
    inviteTeamMember,
    getClinicInvites,
    resendInvite,
    cancelInvite,
} from "@/app/actions/team";

const inviteSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Email inválido"),
    role: z.string().min(1, "Selecciona un rol"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface Invite {
    id: string;
    email: string;
    role: string;
    inviter_name: string;
    status: string;
    created_at: string;
}

interface InviteModalProps {
    trigger?: React.ReactNode;
    onInviteSent?: () => void;
}

export default function InviteModal({ trigger, onInviteSent }: InviteModalProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<InviteFormValues>({
        resolver: zodResolver(inviteSchema),
        defaultValues: { name: "", email: "", role: "profesional" },
    });

    const selectedRole = watch("role");

    // Fetch invites when modal opens
    useEffect(() => {
        if (open && user?.id) {
            fetchInvites();
        }
    }, [open, user?.id]);

    const fetchInvites = async () => {
        if (!user?.id) return;
        setLoadingInvites(true);
        const result = await getClinicInvites(user.id);
        if (result.success) {
            setInvites(result.data || []);
        }
        setLoadingInvites(false);
    };

    const onSubmit = async (values: InviteFormValues) => {
        setLoading(true);
        const result = await inviteTeamMember(
            values.email,
            values.name || "",
            values.role,
            user?.id
        );

        if (result.success) {
            toast.success(`Invitación enviada a ${values.email}`);
            reset();
            fetchInvites();
            onInviteSent?.();
        } else {
            toast.error(result.error || "Error al enviar invitación");
        }
        setLoading(false);
    };

    const handleResend = async (inviteId: string) => {
        setActionLoading(inviteId);
        const result = await resendInvite(inviteId);
        if (result.success) {
            toast.success("Invitación reenviada");
        } else {
            toast.error(result.error || "Error al reenviar");
        }
        setActionLoading(null);
    };

    const handleCancel = async (inviteId: string) => {
        setActionLoading(inviteId);
        const result = await cancelInvite(inviteId);
        if (result.success) {
            toast.success("Invitación cancelada");
            fetchInvites();
        } else {
            toast.error(result.error || "Error al cancelar");
        }
        setActionLoading(null);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "superadmin":
                return (
                    <Badge className="bg-amber-100 text-amber-700 border-none gap-1 text-[10px]">
                        <Crown className="h-3 w-3" /> Dueño
                    </Badge>
                );
            case "recepcionista":
                return (
                    <Badge className="bg-blue-100 text-blue-700 border-none gap-1 text-[10px]">
                        <MessageSquare className="h-3 w-3" /> Recepción
                    </Badge>
                );
            case "profesional":
                return (
                    <Badge className="bg-emerald-100 text-emerald-700 border-none gap-1 text-[10px]">
                        <Stethoscope className="h-3 w-3" /> Dentista
                    </Badge>
                );
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <Badge className="bg-yellow-50 text-yellow-600 border-none gap-1 text-[10px]">
                        <Clock className="h-3 w-3" /> Pendiente
                    </Badge>
                );
            case "accepted":
                return (
                    <Badge className="bg-green-50 text-green-600 border-none gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> Aceptada
                    </Badge>
                );
            case "expired":
            case "cancelled":
                return (
                    <Badge className="bg-red-50 text-red-500 border-none gap-1 text-[10px]">
                        <XCircle className="h-3 w-3" /> {status === "expired" ? "Expirada" : "Cancelada"}
                    </Badge>
                );
            default:
                return null;
        }
    };

    const pendingInvites = invites.filter((i) => i.status === "pending");
    const pastInvites = invites.filter((i) => i.status !== "pending");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-[#10B981] hover:bg-[#059669] text-white font-bold gap-2">
                        <Plus className="h-4 w-4" /> Invitar Miembro
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 bg-white/80 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.25)]">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-[#10B981]" />
                                </div>
                                Invitar miembros al equipo
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">
                                Se enviará un email con enlace de acceso. El invitado tendrá 24hs para aceptar.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Nombre Completo <span className="text-slate-300 normal-case font-normal">(opcional)</span>
                            </Label>
                            <Input
                                {...register("name")}
                                placeholder="Ej: Dra. Ana Silva"
                                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Email <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                {...register("email")}
                                type="email"
                                placeholder="ana@clinica.com"
                                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
                            />
                            {errors.email && (
                                <p className="text-xs text-red-500">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Rol en Livio <span className="text-red-400">*</span>
                            </Label>
                            <Select
                                value={selectedRole}
                                onValueChange={(val) => setValue("role", val)}
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="superadmin">
                                        <span className="flex items-center gap-2">
                                            <Crown className="h-4 w-4 text-amber-500" />
                                            Dueño / Admin
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="recepcionista">
                                        <span className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-blue-500" />
                                            Recepcionista
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="profesional">
                                        <span className="flex items-center gap-2">
                                            <Stethoscope className="h-4 w-4 text-emerald-600" />
                                            Profesional Odontólogo
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm gap-2 shadow-lg shadow-[#10B981]/20 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-4 w-4" /> Generar invitación
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Pending Invites */}
                    <AnimatePresence>
                        {(pendingInvites.length > 0 || pastInvites.length > 0) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-t border-slate-100"
                            >
                                <div className="px-6 py-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                        Invitaciones ({invites.length})
                                    </h4>

                                    {loadingInvites ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {invites.map((invite, index) => (
                                                <motion.div
                                                    key={invite.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">
                                                            {invite.email}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {getRoleBadge(invite.role)}
                                                            {getStatusBadge(invite.status)}
                                                        </div>
                                                    </div>

                                                    {invite.status === "pending" && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-400 hover:text-[#10B981]"
                                                                onClick={() => handleResend(invite.id)}
                                                                disabled={actionLoading === invite.id}
                                                            >
                                                                {actionLoading === invite.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-400 hover:text-red-500"
                                                                onClick={() => handleCancel(invite.id)}
                                                                disabled={actionLoading === invite.id}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
