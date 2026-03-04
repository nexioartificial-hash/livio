"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Plus, Trash2, ChevronRight, ChevronLeft, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { titleCase, formatCUIT } from "@/utils/masks";

const clinicSchema = z.object({
    name: z.string().min(1, "El nombre comercial es requerido").transform(titleCase),
    email: z.string().email("Email profesional inválido"),
    phone: z.string().min(1, "El teléfono es requerido"),
    cuit: z
        .string()
        .optional()
        .refine(
            (val) => !val || /^\d{2}-\d{8}-\d{1}$/.test(val),
            "Formato CUIT inválido (XX-XXXXXXXX-X)"
        ),
    branches: z.array(z.object({
        name: z.string().min(1, "Nombre de sucursal requerido").transform(titleCase),
        address: z.string().min(1, "Dirección requerida"),
        google_maps_url: z.string().url("URL inválida").optional().or(z.literal("")),
    })).min(1, "Debe agregar al menos una sucursal"),
});

type ClinicFormValues = z.infer<typeof clinicSchema>;

interface ClinicStepProps {
    onNext: () => void;
    onBack: () => void;
}

export default function ClinicStep({ onNext, onBack }: ClinicStepProps) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const { register, control, handleSubmit, formState: { errors }, watch, setValue } = useForm<ClinicFormValues>({
        resolver: zodResolver(clinicSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            cuit: "",
            branches: [{ name: "Sede Central", address: "", google_maps_url: "" }],
        },
    });

    // Prefill user email
    useEffect(() => {
        const prefillEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setValue("email", user.email);
                console.log("📧 [ClinicStep] Email pre-llenado:", user.email);
            }
        };
        prefillEmail();
    }, [supabase, setValue]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "branches",
    });

    const onSubmit = async (values: ClinicFormValues) => {
        setLoading(true);
        console.log("🚀 [ClinicStep] Iniciando guardado...", values);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sesión no encontrada. Por favor reingresa.");

            console.log("👤 [ClinicStep] Usuario autenticado:", user.id);

            // 1. Insert Clinic
            const { data: clinic, error: clinicError } = await supabase
                .from("clinic")
                .insert({
                    owner_id: user.id,
                    name: values.name,
                    email: values.email,
                    phone: values.phone,
                    cuit: values.cuit,
                })
                .select()
                .maybeSingle(); // Use maybeSingle to avoid throw if RLS delays

            if (clinicError) {
                console.error("❌ [ClinicStep] Error al crear clínica:", clinicError);
                toast.error(`Error de Base de Datos: ${clinicError.message || "Sin mensaje"}`);
                if (clinicError.details) console.error("Detalles:", clinicError.details);
                if (clinicError.hint) console.error("Sugerencia:", clinicError.hint);
                throw clinicError;
            }
            if (!clinic) throw new Error("No se pudo crear la clínica. Verifica los permisos (RLS).");

            console.log("🏢 [ClinicStep] Clínica creada:", clinic.id);

            // 2. Insert Branches
            const branchesToInsert = values.branches.map(b => ({
                clinic_id: clinic.id,
                name: b.name,
                address: b.address,
                google_maps_url: b.google_maps_url,
            }));

            const { error: branchError } = await supabase
                .from("sucursal")
                .insert(branchesToInsert);

            if (branchError) {
                console.error("❌ [ClinicStep] Error al crear sucursales:", branchError);
                toast.error(`Error en sucursales: ${branchError.message}`);
                throw branchError;
            }

            console.log("📍 [ClinicStep] Sucursales creadas.");

            // 3. Upsert professional profile
            const { error: profileError } = await supabase
                .from("professional")
                .upsert({
                    id: user.id,
                    clinic_id: clinic.id,
                    full_name: user.user_metadata?.full_name || values.name,
                    role: 'superadmin',
                    license: user.user_metadata?.license || "",
                    updated_at: new Date().toISOString(),
                });

            if (profileError) {
                console.error("❌ [ClinicStep] Error al actualizar perfil:", profileError);
                toast.error(`Error en perfil: ${profileError.message}`);
                throw profileError;
            }

            console.log("✅ [ClinicStep] Todo guardado con éxito.");
            toast.success("¡Clínica configurada!");
            onNext();
        } catch (error: any) {
            console.error("🔥 [ClinicStep] Error fatal:", error);
            // Si el objeto de error es un PostgrestError, tendrá message. Si no, lo mostramos entero.
            const errorMsg = error.message || JSON.stringify(error);
            toast.error("Error: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-2 mb-8">
                <h2 className="text-3xl font-black text-slate-900">Datos de tu clínica</h2>
                <p className="text-slate-500 font-medium">Cuéntanos sobre tu espacio de trabajo.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100">
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-bold ml-1">Nombre Comercial</Label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        className="h-12 pl-12 rounded-xl bg-white border-white/50 shadow-sm focus:ring-[#76D7B6]"
                                        placeholder="Ej: Clínica Dental Livio"
                                        onChange={(e) => field.onChange(titleCase(e.target.value))}
                                    />
                                )}
                            />
                        </div>
                        {errors.name && <p className="text-red-500 text-xs font-bold ml-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-600 font-bold ml-1">Email Profesional</Label>
                        <Input {...register("email")} className="h-12 rounded-xl bg-white border-white/50 shadow-sm" placeholder="hola@tunegocio.com" />
                        {errors.email && <p className="text-red-500 text-xs font-bold ml-1">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-600 font-bold ml-1">Teléfono de Consultas</Label>
                        <Input {...register("phone")} className="h-12 rounded-xl bg-white border-white/50 shadow-sm" placeholder="+54 11 ..." />
                        {errors.phone && <p className="text-red-500 text-xs font-bold ml-1">{errors.phone.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-600 font-bold ml-1">CUIT (Opcional)</Label>
                        <Controller
                            name="cuit"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    className="h-12 rounded-xl bg-white border-white/50 shadow-sm"
                                    placeholder="XX-XXXXXXXX-X"
                                    onChange={(e) => field.onChange(formatCUIT(e.target.value))}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Branches */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Sucursales ({fields.length})</h3>
                            <p className="text-sm text-slate-500">¿Tienes más de una ubicación?</p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ name: `Sucursal ${fields.length + 1}`, address: "", google_maps_url: "" })}
                            className="rounded-xl font-bold gap-2 text-[#76D7B6] border-[#76D7B6]/20 hover:bg-[#76D7B6]/5"
                        >
                            <Plus size={18} /> Agregar Sede
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <motion.div
                                key={field.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100/50 space-y-4 relative group"
                            >
                                {index > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="absolute top-6 right-6 text-red-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-tighter text-slate-400">Nombre de la Sede</Label>
                                        <Controller
                                            name={`branches.${index}.name`}
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    className="h-11 rounded-xl bg-white shadow-sm border-transparent"
                                                    onChange={(e) => field.onChange(titleCase(e.target.value))}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-tighter text-slate-400">Dirección</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                            <Input {...register(`branches.${index}.address`)} className="h-11 pl-9 rounded-xl bg-white shadow-sm border-transparent" placeholder="Calle 123, Ciudad" />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-tighter text-slate-400">Google Maps URL (Embed/Link)</Label>
                                        <Input {...register(`branches.${index}.google_maps_url`)} className="h-11 rounded-xl bg-white shadow-sm border-transparent" placeholder="https://maps.google.com/..." />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-8">
                    <Button type="button" variant="ghost" onClick={onBack} className="h-12 px-6 rounded-xl font-bold text-slate-400">
                        <ChevronLeft className="mr-2" /> Volver
                    </Button>
                    <Button type="submit" disabled={loading} className="h-12 px-10 rounded-xl bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-black shadow-lg shadow-[#76D7B6]/20 transition-all">
                        {loading ? "Guardando..." : "Continuar"} <ChevronRight className="ml-2" />
                    </Button>
                </div>
            </form>
        </div>
    );
}
