"use client";

import React, { useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Send,
    Users,
    Crown,
    Stethoscope,
    MessageSquare,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { inviteTeamMember } from "@/app/actions/team";
import { titleCase } from "@/utils/formatters";

const inviteSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    email: z.string().email("Email inválido").refine((val) => val.toLowerCase().endsWith(".com"), {
        message: "El email debe terminar en .com",
    }),
    role: z.string().min(1, "Selecciona un rol"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteModalProps {
    trigger?: React.ReactNode;
    onInviteSent?: () => void;
}

export default function InviteModal({ trigger, onInviteSent }: InviteModalProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

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

    const onSubmit = async (values: InviteFormValues) => {
        setLoading(true);
        const result = await inviteTeamMember(
            values.email.toLowerCase(),
            values.name,
            values.role,
            user?.id
        );

        if (result.success) {
            toast.success(`Invitación enviada a ${values.email}`);
            reset();
            setOpen(false);
            onInviteSent?.();
        } else {
            toast.error(result.error || "Error al enviar invitación");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-white dark:bg-slate-950 shadow-2xl rounded-2xl">
                <div className="p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                             <div className="h-8 w-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                                <Users className="h-4 w-4 text-[#10B981]" />
                            </div>
                            Invitar Miembro
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                            Completa los datos para enviar el acceso.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Nombre Completo
                            </Label>
                            <Input
                                {...register("name")}
                                onChange={(e) => {
                                    const formatted = titleCase(e.target.value);
                                    setValue("name", formatted, { shouldValidate: true });
                                }}
                                placeholder="Ej: Dr. Juan Pérez"
                                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-[#10B981] focus:border-[#10B981]"
                            />
                            {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Email
                            </Label>
                            <Input
                                {...register("email")}
                                type="email"
                                onChange={(e) => {
                                    setValue("email", e.target.value.toLowerCase(), { shouldValidate: true });
                                }}
                                placeholder="juan@clinica.com"
                                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                            />
                            {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Rol
                            </Label>
                            <Select
                                value={selectedRole}
                                onValueChange={(val) => setValue("role", val)}
                            >
                                <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="superadmin">
                                        <span className="flex items-center gap-2">
                                            <Crown className="h-3.5 w-3.5 text-amber-500" /> Dueño
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="recepcionista">
                                        <span className="flex items-center gap-2">
                                            <MessageSquare className="h-3.5 w-3.5 text-blue-500" /> Recepcionista
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="profesional">
                                        <span className="flex items-center gap-2">
                                            <Stethoscope className="h-3.5 w-3.5 text-emerald-600" /> Dentista
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm gap-2 transition-all mt-2"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-3.5 w-3.5" /> Enviar Invitación
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
