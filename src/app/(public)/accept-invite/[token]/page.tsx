"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Stethoscope, Crown, MessageSquare, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface InviteData {
    id: string;
    email: string;
    role: string;
    clinic_id: string;
    inviter_name: string;
    status: string;
}

export default function AcceptInvitePage() {
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;
    const supabase = createClient();

    const [invite, setInvite] = useState<InviteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        password: "",
        license: "",
    });

    // Validate the token on mount
    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const res = await fetch(`/api/validate-invite/${token}`);
            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || "Invitación inválida o expirada.");
                setLoading(false);
                return;
            }

            setInvite(data.invite);
        } catch {
            setError("Error al validar la invitación.");
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite) return;

        setSubmitting(true);

        try {
            // 1. Sign up the user with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: invite.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: invite.role,
                        clinic_id: invite.clinic_id,
                        invited: true,
                    },
                },
            });

            if (authError) {
                toast.error("Error al crear cuenta: " + authError.message);
                setSubmitting(false);
                return;
            }

            // 2. Accept invite (creates professional profile, marks accepted)
            if (authData.user) {
                const res = await fetch(`/api/accept-invite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        token,
                        userId: authData.user.id,
                        fullName: formData.fullName,
                        license: formData.license || null,
                    }),
                });

                const result = await res.json();
                if (!res.ok) {
                    console.error("Accept invite failed:", result.error);
                }
            }

            toast.success("¡Cuenta creada! Bienvenido al equipo.");
            router.replace("/dashboard");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Error al crear cuenta");
        }
        setSubmitting(false);
    };

    const getRoleInfo = (role: string) => {
        switch (role) {
            case "superadmin":
                return { icon: <Crown className="h-5 w-5" />, label: "Dueño / Admin", color: "bg-amber-100 text-amber-700" };
            case "recepcionista":
                return { icon: <MessageSquare className="h-5 w-5" />, label: "Recepcionista", color: "bg-blue-100 text-blue-700" };
            case "profesional":
                return { icon: <Stethoscope className="h-5 w-5" />, label: "Profesional Odontólogo", color: "bg-emerald-100 text-emerald-700" };
            default:
                return { icon: null, label: role, color: "bg-slate-100 text-slate-700" };
        }
    };

    // ─── Loading ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" />
            </div>
        );
    }

    // ─── Error / Invalid Token ───────────────────────────────
    if (error || !invite) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-4 text-center"
                >
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Invitación inválida</h1>
                    <p className="text-slate-500">
                        {error || "Esta invitación no existe, ya fue aceptada, o expiró."}
                    </p>
                    <Button
                        onClick={() => router.push("/login")}
                        className="bg-[#10B981] hover:bg-[#059669] text-white"
                    >
                        Ir al login
                    </Button>
                </motion.div>
            </div>
        );
    }

    const roleInfo = getRoleInfo(invite.role);

    // ─── Signup Form ─────────────────────────────────────────
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md space-y-6"
            >
                <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-slate-200/60">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <Image
                            src="/logo-transparent.png"
                            alt="Livio"
                            width={80}
                            height={32}
                            className="mb-4 opacity-80"
                        />
                        <h2 className="text-2xl font-bold text-slate-900">
                            ¡Te invitaron a Livio!
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            <strong className="text-slate-700">{invite.inviter_name}</strong> te invitó al equipo
                        </p>
                        {/* Role Badge */}
                        <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl ${roleInfo.color}`}>
                            {roleInfo.icon}
                            <span className="font-semibold text-sm">{roleInfo.label}</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Email
                            </Label>
                            <Input
                                value={invite.email}
                                disabled
                                className="h-11 rounded-xl bg-slate-100 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Nombre Completo <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                placeholder="Ej: Dra. Ana Silva"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="h-11 rounded-xl bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Contraseña <span className="text-red-400">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="h-11 rounded-xl bg-slate-50 border-slate-200 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Extra fields for professionals */}
                        {invite.role === "profesional" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="space-y-2"
                            >
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Matrícula Nacional (MN)
                                </Label>
                                <Input
                                    placeholder="Ej: 123456"
                                    value={formData.license}
                                    onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                                    className="h-11 rounded-xl bg-slate-50 border-slate-200"
                                />
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm gap-2 shadow-lg shadow-[#10B981]/20 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Crear cuenta y unirme
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <p className="mt-4 text-center text-[10px] text-slate-300">
                        Cumplimiento Ley 27.706 · Datos protegidos
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
