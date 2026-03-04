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
import { titleCase } from "@/utils/masks";
import { sedeSchema, type SedeValues } from "@/lib/validators/config";

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
            confirmAddress: false
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
                    confirmAddress: !!editingSede.google_maps_url
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
                    confirmAddress: false
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#76D7B6]" /> {editingSede ? "Editar Sede" : "Nueva Sede"}
                </h3>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                    <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1 block">Nombre</Label>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    placeholder="Ej: Sede Central"
                                    className={cn(errors.name && "border-red-500")}
                                    onChange={(e) => field.onChange(titleCase(e.target.value))}
                                />
                            )}
                        />
                        {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-medium text-slate-600 mb-1 block">Dirección</Label>
                            <Controller
                                name="address"
                                control={control}
                                render={({ field }) => (
                                    <Input {...field} placeholder="Ej: Av. Corrientes 1234" className={cn(errors.address && "border-red-500")} />
                                )}
                            />
                            {errors.address && <p className="text-[10px] text-red-500 mt-1">{errors.address.message}</p>}
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-slate-600 mb-1 block">Localidad</Label>
                            <Controller
                                name="location"
                                control={control}
                                render={({ field }) => (
                                    <Input {...field} placeholder="Ej: Palermo, CABA" className={cn(errors.location && "border-red-500")} />
                                )}
                            />
                            {errors.location && <p className="text-[10px] text-red-500 mt-1">{errors.location.message}</p>}
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1 block">Aclaraciones</Label>
                        <Controller
                            name="aclaraciones"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    {...field}
                                    placeholder="Depto/Piso, timbre, referencias para pacientes..."
                                    rows={2}
                                    className={cn("min-h-[60px]", errors.aclaraciones && "border-red-500")}
                                    onChange={(e) => field.onChange(e.target.value.slice(0, 200))}
                                />
                            )}
                        />
                        <div className="flex justify-between mt-1">
                            {errors.aclaraciones && <p className="text-[10px] text-red-500">{errors.aclaraciones.message}</p>}
                            <p className="text-[10px] text-slate-400 ml-auto">{(watch("aclaraciones") || "").length}/200</p>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1 block">Teléfono (celular)</Label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-sm font-medium text-slate-400">+54</span>
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        className="pl-12"
                                        placeholder="Ej: 11 4567-8900"
                                        onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ""))}
                                    />
                                )}
                            />
                        </div>
                        {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone.message}</p>}
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1 block">Email de contacto</Label>
                        <div className="relative flex items-center">
                            <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="email"
                                        className={cn("pl-10", errors.email && "border-red-500")}
                                        placeholder="Ej: contacto@sede.com"
                                    />
                                )}
                            />
                        </div>
                        {errors.email && <p className="text-[10px] text-red-500 mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-medium text-slate-600">Enlace de Google Maps</Label>
                            {watch("google_maps_url") && (
                                <a
                                    href={watch("google_maps_url")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-[#76D7B6] font-bold hover:underline flex items-center gap-1"
                                >
                                    Abrir Mapa <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                            )}
                        </div>
                        <Controller
                            name="google_maps_url"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    className="text-xs italic mb-2"
                                    placeholder="Se genera automáticamente o pega uno manual"
                                    onChange={(e) => {
                                        setIsManualUrl(true);
                                        field.onChange(e.target.value);
                                    }}
                                />
                            )}
                        />
                        {errors.google_maps_url && <p className="text-[10px] text-red-500 mb-1">{errors.google_maps_url.message}</p>}

                        <Controller
                            name="confirmAddress"
                            control={control}
                            render={({ field }) => (
                                <label className="flex items-center gap-2 cursor-pointer group px-1">
                                    <input
                                        type="checkbox"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        className={cn(
                                            "rounded border-slate-300 text-[#76D7B6] focus:ring-[#76D7B6] h-3.5 w-3.5",
                                            errors.confirmAddress && "border-red-500"
                                        )}
                                    />
                                    <span className="text-[11px] text-slate-500 group-hover:text-slate-900 transition-colors">
                                        Confirmo que la ubicación coincide con el link de Google Maps
                                    </span>
                                </label>
                            )}
                        />
                        {errors.confirmAddress && <p className="text-[10px] text-red-500 mt-1">{errors.confirmAddress.message}</p>}
                    </div>

                    <div className="flex gap-2 mt-5 items-center justify-between">
                        {editingSede ? (
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
                                className="bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8]"
                                disabled={saving || !isValid}
                            >
                                {saving ? "Guardando..." : (editingSede ? "Actualizar" : "Guardar Sede")}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
