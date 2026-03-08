"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Save, X, Stethoscope, MapPin, Clock, User, Check, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateMemberProfessional, deleteMember } from "@/app/actions/team";

const editSchema = z.object({
    full_name: z.string().min(2, "Mínimo 2 caracteres"),
    matricula_nacional: z.string().optional(),
    specialty: z.string().optional(),
    sucursales: z.array(z.string()),
    horarios: z.any().optional(),
    activo: z.boolean(),
});

type EditFormValues = z.infer<typeof editSchema>;

interface MemberEditModalProps {
    member: any;
    sucursales: any[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function MemberEditModal({ member, sucursales, open, onOpenChange, onSuccess }: MemberEditModalProps) {
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
        defaultValues: {
            full_name: member?.full_name || "",
            matricula_nacional: member?.matricula_nacional || "",
            specialty: member?.specialty || "Odontología General",
            sucursales: member?.sucursales || [],
            horarios: member?.horarios || {},
            activo: member?.activo ?? true,
        },
    });

    useEffect(() => {
        if (member) {
            setValue("full_name", member.full_name);
            setValue("matricula_nacional", member.matricula_nacional || "");
            setValue("specialty", member.specialty || "Odontología General");
            setValue("sucursales", member.sucursales || []);
            setValue("horarios", member.horarios || {});
            setValue("activo", member.activo ?? true);
        }
    }, [member, setValue]);

    const selectedSucursales = watch("sucursales") || [];

    const toggleSucursal = (id: string) => {
        const current = [...selectedSucursales];
        if (current.includes(id)) {
            setValue("sucursales", current.filter(s => s !== id));
        } else {
            setValue("sucursales", [...current, id]);
        }
    };

    const onSubmit = async (data: EditFormValues) => {
        setLoading(true);
        try {
            const res = await updateMemberProfessional(member.id, {
                matricula_nacional: data.matricula_nacional,
                specialty: data.specialty,
                sucursales: data.sucursales,
                horarios: data.horarios,
                activo: data.activo,
            });

            if (res.success) {
                toast.success("Perfil actualizado correctamente");
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(res.error || "Error al actualizar perfil");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await deleteMember(member.id);
            if (res.success) {
                toast.success("Miembro eliminado correctamente");
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(res.error || "Error al eliminar");
            }
        } catch {
            toast.error("Error inesperado");
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    if (!member) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <div className="bg-[#76D7B6] p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <User className="h-6 w-6" />
                            Editar Perfil: {member.full_name}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</Label>
                            <Input 
                                {...register("full_name")}
                                className="bg-slate-50 border-slate-100 rounded-xl focus:ring-[#76D7B6]/20"
                            />
                            {errors.full_name && <p className="text-[10px] text-red-500">{errors.full_name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Matrícula Nacional</Label>
                            <div className="relative">
                                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    {...register("matricula_nacional")}
                                    placeholder="MN 123456"
                                    className="pl-9 bg-slate-50 border-slate-100 rounded-xl focus:ring-[#76D7B6]/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Especialidad</Label>
                            <Select 
                                value={watch("specialty")}
                                onValueChange={(val) => setValue("specialty", val)}
                            >
                                <SelectTrigger className="bg-slate-50 border-slate-100 rounded-xl focus:ring-[#76D7B6]/20">
                                    <SelectValue placeholder="Selecciona especialidad" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100">
                                    <SelectItem value="Odontología General">Odontología General</SelectItem>
                                    <SelectItem value="Ortodoncia">Ortodoncia</SelectItem>
                                    <SelectItem value="Endodoncia">Endodoncia</SelectItem>
                                    <SelectItem value="Implantología">Implantología</SelectItem>
                                    <SelectItem value="Odontopediatría">Odontopediatría</SelectItem>
                                    <SelectItem value="Cirugía Bucal">Cirugía Bucal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Estado</Label>
                            <Select 
                                value={watch("activo") ? "true" : "false"}
                                onValueChange={(val) => setValue("activo", val === "true")}
                            >
                                <SelectTrigger className="bg-slate-50 border-slate-100 rounded-xl focus:ring-[#76D7B6]/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100">
                                    <SelectItem value="true">Activo</SelectItem>
                                    <SelectItem value="false">Inactivo (Solo dueño)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Asignación de Sedes
                        </Label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            {sucursales.map((suc) => (
                                <Badge 
                                    key={suc.id}
                                    variant={selectedSucursales.includes(suc.id) ? "default" : "outline"}
                                    className={cn(
                                        "cursor-pointer transition-all text-[11px] py-1.5 px-3 rounded-xl",
                                        selectedSucursales.includes(suc.id) 
                                            ? "bg-[#76D7B6] text-white border-none shadow-sm" 
                                            : "bg-white text-slate-500 border-slate-200 hover:border-[#76D7B6] hover:text-[#76D7B6]"
                                    )}
                                    onClick={() => toggleSucursal(suc.id)}
                                >
                                    {selectedSucursales.includes(suc.id) && <Check className="h-3 w-3 mr-1" />}
                                    {suc.name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-amber-700 uppercase mb-1">Nota sobre horarios</p>
                            <p className="text-[10px] text-amber-600 leading-relaxed font-medium">
                                La configuración detallada de días y horas se realiza desde la Agenda para mayor precisión.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 flex-row items-center">
                        {/* Delete zone - left side */}
                        {member.role !== "superadmin" && (
                            <div className="flex items-center gap-2 mr-auto">
                                {confirmDelete ? (
                                    <>
                                        <span className="text-xs text-red-500 font-bold">¿Confirmar?</span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={deleting}
                                            className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs gap-1 h-9"
                                            onClick={handleDelete}
                                        >
                                            {deleting ? <Clock className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                            Sí, eliminar
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-xl text-xs h-9"
                                            onClick={() => setConfirmDelete(false)}
                                        >
                                            No
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xs gap-1.5 h-9"
                                        onClick={() => setConfirmDelete(true)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                    </Button>
                                )}
                            </div>
                        )}
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="rounded-xl"
                            onClick={() => { setConfirmDelete(false); onOpenChange(false); }}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="bg-[#76D7B6] hover:bg-[#65c5a4] text-white rounded-xl gap-2 min-w-[120px]"
                        >
                            {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
