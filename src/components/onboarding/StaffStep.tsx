import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, ChevronRight, ChevronLeft, Stethoscope, Award, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const staffSchema = z.object({
    professionals: z.array(z.object({
        full_name: z.string().min(3, "Mínimo 3 caracteres"),
        license: z.string().min(4, "Matrícula requerida"),
        specialty: z.string().min(3, "Especialidad requerida"),
        email: z.string().email("Email inválido"),
    })).min(1, "Debe agregar al menos un profesional"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffStepProps {
    onNext: () => void;
    onBack: () => void;
}

export default function StaffStep({ onNext, onBack }: StaffStepProps) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const { register, control, handleSubmit, formState: { errors } } = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: {
            professionals: [{ full_name: "", license: "", specialty: "", email: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "professionals",
    });

    const onSubmit = async (values: StaffFormValues) => {
        setLoading(true);
        console.log("🚀 [StaffStep] Guardando equipo...", values.professionals);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // 1. Get the clinic_id of the current professional
            const { data: profile } = await supabase
                .from("professional")
                .select("clinic_id")
                .eq("id", user.id)
                .single();

            if (!profile?.clinic_id) throw new Error("No se encontró la clínica asociada.");

            // 2. Identify the entry for the current user
            // We search by email or just take the first one if only one exists
            const currentUserData = values.professionals.find(p => p.email.toLowerCase() === user.email?.toLowerCase())
                || values.professionals[0];

            // 3. Upsert CURRENT user profile (the owner/primary professional)
            const profileData: any = {
                id: user.id,
                clinic_id: profile.clinic_id,
                full_name: currentUserData.full_name,
                license: currentUserData.license,
                role: 'superadmin',
                updated_at: new Date().toISOString(),
            };

            // Only add specialty if it was provided, but warn if it fails
            if (currentUserData.specialty) {
                profileData.specialty = currentUserData.specialty;
            }

            const { error: upsertError } = await supabase
                .from("professional")
                .upsert(profileData);

            if (upsertError) {
                if (upsertError.message.includes("specialty")) {
                    throw new Error("La columna 'specialty' no existe en tu base de datos. Por favor, ejecuta el script SQL actualizado en Supabase.");
                }
                throw upsertError;
            }

            // 4. For other professionals: 
            // In a real flow, we should call 'inviteTeamMember' for each one.
            // But to avoid "bulk email spam" during onboarding and potential config errors,
            // we will log them and tell the user they can invite them fully from the dashboard.
            const others = values.professionals.filter(p =>
                p.email.toLowerCase() !== user.email?.toLowerCase() && p !== currentUserData
            );

            if (others.length > 0) {
                console.log("📝 [StaffStep] Pendiente invitar a:", others);
                toast.info(`Se guardó tu perfil. Podrás invitar a los otros ${others.length} profesionales desde el Dashboard.`);
            } else {
                toast.success("Perfil médico actualizado correctamente");
            }

            onNext();
        } catch (error: any) {
            console.error("🔥 [StaffStep] Error:", error);
            toast.error("Error al configurar equipo: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-2 mb-8">
                <h2 className="text-3xl font-black text-slate-900">Tu Equipo Médico</h2>
                <p className="text-slate-500 font-medium">Configura los profesionales que trabajarán en la clínica.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Profesionales ({fields.length})</h3>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ full_name: "", license: "", specialty: "", email: "" })}
                        className="rounded-xl font-bold gap-2 text-blue-600 border-blue-100 hover:bg-blue-50"
                    >
                        <Plus size={18} /> Agregar Profesional
                    </Button>
                </div>

                <div className="space-y-6">
                    {fields.map((field: any, index: number) => (
                        <motion.div
                            key={field.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm space-y-4 relative"
                        >
                            {index > 0 && (
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="absolute top-6 right-6 text-slate-300 hover:text-red-500"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}

                            <div className="flex gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:border-[#76D7B6] hover:text-[#76D7B6] transition-all">
                                        <Camera size={24} />
                                        <span className="text-[10px] font-bold mt-1">FOTO</span>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400">Nombre Completo</Label>
                                        <Input {...register(`professionals.${index}.full_name`)} className="h-10 rounded-lg" placeholder="Dr/a. Nombre Apellido" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400">Email</Label>
                                        <Input {...register(`professionals.${index}.email`)} className="h-10 rounded-lg" placeholder="dr@clinica.com" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400">Matrícula Nacional</Label>
                                        <div className="relative">
                                            <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                            <Input {...register(`professionals.${index}.license`)} className="h-10 pl-9 rounded-lg" placeholder="MN 12345" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400">Especialidad</Label>
                                        <div className="relative">
                                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                            <Input {...register(`professionals.${index}.specialty`)} className="h-10 pl-9 rounded-lg" placeholder="Ej: Ortodoncia" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-between pt-8">
                    <Button type="button" variant="ghost" onClick={onBack} className="h-12 px-6 rounded-xl font-bold text-slate-400">
                        <ChevronLeft className="mr-2" /> Volver
                    </Button>
                    <Button type="submit" disabled={loading} className="h-12 px-10 rounded-xl bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-black shadow-lg shadow-[#76D7B6]/20">
                        {loading ? "Guardando..." : "Continuar"} <ChevronRight className="ml-2" />
                    </Button>
                </div>
            </form>
        </div>
    );
}
