"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { titleCase } from "@/utils/formatters";
import { obraSocialSchema, type ObraSocialValues } from "@/lib/validators/config";

interface ObrasSocialesModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem: any | null;
    clinicId: string;
    onSuccess: (data: any, isEdit: boolean) => void;
}

export default function ObrasSocialesModal({ isOpen, onClose, editingItem, clinicId, onSuccess }: ObrasSocialesModalProps) {
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isValid }
    } = useForm<ObraSocialValues>({
        mode: "onChange",
        resolver: zodResolver(obraSocialSchema) as any,
        defaultValues: {
            nombre: "",
            codigo: "",
            activo: true
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                reset({
                    nombre: editingItem.nombre || "",
                    codigo: editingItem.codigo || "",
                    activo: editingItem.activo ?? true
                });
            } else {
                reset({
                    nombre: "",
                    codigo: "",
                    activo: true
                });
            }
        }
    }, [isOpen, editingItem, reset]);

    const onSubmit = async (values: ObraSocialValues) => {
        setSaving(true);
        const toastId = toast.loading(editingItem ? "Actualizando obra social..." : "Guardando obra social...");

        try {
            const payload = {
                ...values,
                nombre: values.nombre.trim(),
                codigo: values.codigo?.trim() || null,
                clinic_id: clinicId
            };

            let res;
            if (editingItem?.id) {
                res = await supabase
                    .from("obras_sociales")
                    .update(payload)
                    .eq("id", editingItem.id)
                    .select()
                    .single();
            } else {
                res = await supabase
                    .from("obras_sociales")
                    .insert(payload)
                    .select()
                    .single();
            }

            if (res.error) throw res.error;

            toast.success(editingItem ? "Obra social actualizada!" : "Obra social creada!", { id: toastId });
            onSuccess(res.data, !!editingItem);
            onClose();
        } catch (error: any) {
            console.error("Error saving obra social:", error);
            toast.error("Error: " + error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem?.id) return;
        if (!confirm(`¿Estás seguro de que deseas eliminar ${editingItem.nombre}?`)) return;

        setSaving(true);
        const toastId = toast.loading("Eliminando obra social...");
        try {
            const { error } = await supabase
                .from("obras_sociales")
                .delete()
                .eq("id", editingItem.id);

            if (error) throw error;

            toast.success("Eliminado correctamente", { id: toastId });
            onSuccess(editingItem.id, false);
            onClose();
        } catch (error: any) {
            toast.error("Error al eliminar: " + error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-accent" /> {editingItem ? "Editar Obra Social" : "Nueva Obra Social"}
                </h3>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Nombre Comercial*</Label>
                        <Controller
                            name="nombre"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    placeholder="Ej: OSDE, Swiss Medical..."
                                    className={cn(errors.nombre && "border-red-500")}
                                    onChange={(e) => field.onChange(titleCase(e.target.value))}
                                />
                            )}
                        />
                        {errors.nombre && <p className="text-[10px] text-red-500 mt-1">{errors.nombre.message}</p>}
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Código Externo / RNAS</Label>
                        <Controller
                            name="codigo"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    placeholder="Ej: 123456"
                                    className={cn(errors.codigo && "border-red-500")}
                                />
                            )}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Opcional. Se usa para reportes y facturación.</p>
                    </div>

                    <div className="flex gap-2 mt-6 items-center justify-between">
                        {editingItem ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 px-2"
                                onClick={handleDelete}
                                disabled={saving}
                            >
                                <Trash2 className="h-4 w-4" /> Eliminar
                            </Button>
                        ) : <div />}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="bg-accent text-slate-900 dark:text-white hover:bg-accent/90 font-bold"
                                disabled={saving || !isValid}
                            >
                                {saving ? "Guardando..." : (editingItem ? "Actualizar" : "Crear")}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
