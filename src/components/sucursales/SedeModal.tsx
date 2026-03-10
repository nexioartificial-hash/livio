"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Mail, ExternalLink, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { titleCase, sentenceCase } from "@/utils/masks";
import { sedeSchema, type SedeValues } from "@/lib/validators/config";
import { Switch } from "@/components/ui/switch";

const DAYS_ES = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo"
} as const;

const DEFAULT_HORARIOS = {
    monday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    tuesday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    wednesday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    thursday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    friday: { enabled: true, slots: [{ start: "09:00", end: "18:00" }] },
    saturday: { enabled: false, slots: [{ start: "09:00", end: "13:00" }] },
    sunday: { enabled: false, slots: [{ start: "09:00", end: "13:00" }] },
};

interface SedeModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingSede: any | null;
    clinicId: string;
    onSuccess: (data: any, isEdit: boolean) => void;
}

export default function SedeModal({ isOpen, onClose, editingSede, clinicId, onSuccess }: SedeModalProps) {
    const [saving, setSaving] = useState(false);
    const [isManualUrl, setIsManualUrl] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid }
    } = useForm<SedeValues>({
        mode: "onChange",
        resolver: zodResolver(sedeSchema),
        defaultValues: {
            name: "",
            address: "",
            location: "",
            aclaraciones: "",
            phone: "",
            email: "",
            google_maps_url: "",
            confirmAddress: false,
            horarios: DEFAULT_HORARIOS
        }
    });

    const address = watch("address");
    const location = watch("location");

    // Auto-sync Maps link effect
    useEffect(() => {
        if (!isManualUrl && (address || location)) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address || ""} ${location || ""}`.trim())}`;
            setValue("google_maps_url", url);
        }
    }, [address, location, isManualUrl, setValue]);

    useEffect(() => {
        if (isOpen) {
            if (editingSede) {
                reset({
                    name: editingSede.name || "",
                    address: editingSede.address || "",
                    location: editingSede.location || "",
                    aclaraciones: editingSede.aclaraciones || "",
                    phone: editingSede.phone?.replace("+54 ", "") || "",
                    email: editingSede.email || "",
                    google_maps_url: editingSede.google_maps_url || "",
                    confirmAddress: !!editingSede.google_maps_url,
                    horarios: editingSede.horarios || DEFAULT_HORARIOS
                });
                setIsManualUrl(!!editingSede.google_maps_url);
            } else {
                reset({
                    name: "",
                    address: "",
                    location: "",
                    aclaraciones: "",
                    phone: "",
                    email: "",
                    google_maps_url: "",
                    confirmAddress: false,
                    horarios: DEFAULT_HORARIOS
                });
                setIsManualUrl(false);
            }
        }
    }, [isOpen, editingSede, reset]);

    const onSubmit = async (values: SedeValues) => {
        setSaving(true);
        const toastId = toast.loading(editingSede ? "Actualizando sede..." : "Guardando sede...");

        try {
            const payload = {
                ...values,
                name: values.name.trim(),
                address: values.address?.trim() || null,
                location: values.location?.trim() || null,
                phone: values.phone ? `+54 ${values.phone.replace("+54 ", "").trim()}` : null,
                email: values.email?.trim().toLowerCase() || null,
                google_maps_url: values.google_maps_url?.trim() || null,
                aclaraciones: values.aclaraciones?.trim() || null,
                clinic_id: clinicId
            };

            let res;
            if (editingSede?.id) {
                res = await supabase
                    .from("sucursal")
                    .update(payload)
                    .eq("id", editingSede.id)
                    .select()
                    .single();
            } else {
                res = await supabase
                    .from("sucursal")
                    .insert(payload)
                    .select()
                    .single();
            }

            if (res.error) throw res.error;

            toast.success(editingSede ? "Sede actualizada!" : "Sede creada!", { id: toastId });
            onSuccess(res.data, !!editingSede);
            onClose();
        } catch (error: any) {
            console.error("Error saving sede:", error);
            toast.error("Error: " + error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingSede?.id) return;
        if (!confirm("¿Estás seguro de que deseas eliminar esta sede?")) return;

        setSaving(true);
        const toastId = toast.loading("Eliminando sede...");
        try {
            const { error } = await supabase
                .from("sucursal")
                .delete()
                .eq("id", editingSede.id);

            if (error) throw error;

            toast.success("Sede eliminada", { id: toastId });
            onSuccess(editingSede.id, false); // Signal deletion
            onClose();
        } catch (error: any) {
            toast.error("Error al eliminar: " + error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors z-20"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="h-10 w-10 bg-[#76D7B6]/10 rounded-xl flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-[#76D7B6]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-none">
                            {editingSede ? "Editar Sede" : "Nueva Sede"}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Completa los datos de tu sucursal</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nombre de la Sede</Label>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        placeholder="Ej: Sede Central"
                                        className={cn("h-10", errors.name && "border-red-500")}
                                        onChange={(e) => field.onChange(titleCase(e.target.value))}
                                    />
                                )}
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Dirección</Label>
                                <Controller
                                    name="address"
                                    control={control}
                                    render={({ field }) => (
                                        <Input 
                                            {...field} 
                                            placeholder="Calle y N°" 
                                            className={cn("h-10", errors.address && "border-red-500")}
                                            onChange={(e) => field.onChange(titleCase(e.target.value))}
                                        />
                                    )}
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Localidad</Label>
                                <Controller
                                    name="location"
                                    control={control}
                                    render={({ field }) => (
                                        <Input 
                                            {...field} 
                                            placeholder="Ciudad/Barrio" 
                                            className={cn("h-10", errors.location && "border-red-500")}
                                            onChange={(e) => field.onChange(titleCase(e.target.value))}
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Aclaraciones</Label>
                            <Controller
                                name="aclaraciones"
                                control={control}
                                render={({ field }) => (
                                    <Textarea
                                        {...field}
                                        placeholder="Depto, piso, referencias..."
                                        rows={2}
                                        className={cn("min-h-[60px] resize-none", errors.aclaraciones && "border-red-500")}
                                        onChange={(e) => field.onChange(sentenceCase(e.target.value.slice(0, 200)))}
                                    />
                                )}
                            />
                            <p className="text-[10px] text-slate-400 text-right mt-1">{(watch("aclaraciones") || "").length}/200</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Teléfono (+54)</Label>
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder="11 4567-8900"
                                            className="h-10"
                                            onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ""))}
                                        />
                                    )}
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Email</Label>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="email"
                                            placeholder="sede@email.com"
                                            className="h-10"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enlace de Google Maps</Label>
                                <a
                                    href={watch("google_maps_url")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-[#76D7B6] font-bold hover:underline flex items-center gap-1"
                                >
                                    Abrir Mapa <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <div className="space-y-3">
                                <Controller
                                    name="google_maps_url"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="space-y-1">
                                            <Input
                                                {...field}
                                                className="text-xs h-9 bg-slate-50 italic truncate"
                                                placeholder="Generado automáticamente o carga manual"
                                                onChange={(e) => {
                                                    setIsManualUrl(true);
                                                    field.onChange(e.target.value);
                                                }}
                                            />
                                            <p className="text-[10px] text-slate-400">
                                                * El enlace se genera automáticamente al escribir la dirección, pero puedes pegarlo manualmente si lo prefieres.
                                            </p>
                                        </div>
                                    )}
                                />
                                <Controller
                                    name="confirmAddress"
                                    control={control}
                                    render={({ field }) => (
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="rounded border-slate-300 text-[#76D7B6] focus:ring-[#76D7B6] h-4 w-4"
                                            />
                                            <span className="text-xs text-slate-500 font-medium group-hover:text-slate-700 transition-colors">
                                                Confirmo que la ubicación coincide con el link de Google Maps
                                            </span>
                                        </label>
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t mt-4">
                        {editingSede && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                onClick={handleDelete}
                                disabled={saving}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-10"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8] h-10 font-medium"
                            disabled={saving || !isValid}
                        >
                            {saving ? "Guardando..." : (editingSede ? "Actualizar" : "Guardar Sede")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
