"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    ClipboardList,
    ChevronLeft,
    FileUp,
    CheckCircle2,
    Activity,
    PenTool,
    Shield
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface BulkHistoryStepProps {
    onBack: () => void;
}

export default function BulkHistoryStep({ onBack }: BulkHistoryStepProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    const templates = [
        { id: "teeth-all", title: "Dentición Completa", description: "Todos los dientes sanos", icon: <CheckCircle2 className="text-green-500" /> },
        { id: "standard", title: "Plantilla Estándar", description: "Diagnóstico inicial común", icon: <ClipboardList className="text-blue-500" /> },
        { id: "ortho", title: "Ortodoncia", description: "Pre-configurado para brackets", icon: <PenTool className="text-indigo-500" /> },
    ];

    const handleFinish = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from("professional")
                    .update({ is_onboarded: true })
                    .eq("id", user.id);

                if (error) throw error;
            }
            toast.success("¡Livio configurado correctamente!");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error("Error al finalizar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-2 mb-8">
                <h2 className="text-3xl font-black text-slate-900">Historia Clínica y Odontograma</h2>
                <p className="text-slate-500 font-medium">Configuración masiva para tus pacientes importados.</p>
            </div>

            <div className="space-y-8 flex-1">
                {/* Bulk Odontogram */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="text-[#76D7B6]" /> Odontograma Masivo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTemplate(t.id)}
                                className={`p-6 rounded-[2rem] border-2 transition-all text-left space-y-2 ${selectedTemplate === t.id
                                        ? "border-[#76D7B6] bg-[#76D7B6]/5"
                                        : "border-slate-50 bg-slate-50/50 hover:bg-white"
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                    {t.icon}
                                </div>
                                <p className="font-bold text-slate-900">{t.title}</p>
                                <p className="text-xs text-slate-400 font-medium">{t.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bulk History Upload */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileUp className="text-blue-500" /> Cargar Historias Clínicas (Bulk)
                    </h3>
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30 text-center">
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                            Sube un Excel con columnas `paciente_id`, `diagnostico`, `antecedentes` para cargar registros masivamente.
                        </p>
                        <Button variant="outline" className="rounded-xl h-12 border-slate-200 font-bold gap-2">
                            <FileUp size={18} /> Seleccionar Archivo
                        </Button>
                    </div>
                </div>

                {/* OTP Signature Mock */}
                <div className="p-6 rounded-[2rem] bg-slate-900 text-white flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Shield className="text-[#76D7B6]" size={32} />
                    </div>
                    <div>
                        <p className="font-black">Firma Digital (Ley 27.706)</p>
                        <p className="text-xs text-slate-400 font-medium">Vinculamos tu cuenta con verificación OTP para validez legal.</p>
                    </div>
                    <Button variant="outline" className="ml-auto rounded-xl border-white/20 text-white bg-white/5 hover:bg-white/10">
                        Configurar
                    </Button>
                </div>
            </div>

            <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={onBack} disabled={loading} className="h-12 px-6 rounded-xl font-bold text-slate-400">
                    <ChevronLeft className="mr-2" /> Volver
                </Button>
                <Button
                    onClick={handleFinish}
                    disabled={loading}
                    className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                    {loading ? "Finalizando..." : "¡Listo! Ir al Dashboard"}
                </Button>
            </div>
        </div>
    );
}
