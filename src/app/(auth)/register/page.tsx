"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Form State
    const [formData, setFormData] = useState({
        clinicName: "",
        cuit: "",
        email: "",
        password: "",
        fullName: "",
        license: ""
    });

    const formatCUIT = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length <= 2) return digits;
        if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "cuit") {
            setFormData({ ...formData, cuit: formatCUIT(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 2) {
            setStep(step + 1);
            return;
        }

        setLoading(true);

        // 1. Sign Up User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    license: formData.license,
                    clinic_name: formData.clinicName, // Trigger will use this
                    cuit: formData.cuit
                    // Trigger is expected to handle: Clinic Creation, Trial Activation (14 days), Role Assignment
                }
            }
        });

        if (authError) {
            toast.error("Error al registrar: " + authError.message);
            setLoading(false);
            return;
        }

        // 2. Create professional profile with superadmin role
        if (authData.user) {
            await supabase.from('professional').upsert({
                id: authData.user.id,
                full_name: formData.fullName,
                license: formData.license,
                role: 'superadmin',
                is_onboarded: false,
            }, { onConflict: 'id' });
        }

        // Success
        toast.success("¡Cuenta creada! Revisa tu email para confirmar.");
        router.push("/dashboard?trial=started"); // Redirect to dashboard (middleware will bounce if email confirmation required, ideally we show a "Check Email" screen)
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-300">
                <div className="flex flex-col items-center text-center">
                    <Image
                        src="/logo-transparent.png"
                        alt="Livio"
                        width={100}
                        height={40}
                        className="mb-6 opacity-80"
                    />
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        {step === 1 ? "Datos de la Clínica" : "Tu Perfil Profesional"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Comienza tu prueba gratuita de 14 días
                    </p>

                    {/* Steps Indicator */}
                    <div className="flex items-center gap-2 mt-4">
                        <div className={`h-2 w-8 rounded-full ${step >= 1 ? "bg-[#76D7B6]" : "bg-slate-200"}`}></div>
                        <div className={`h-2 w-8 rounded-full ${step >= 2 ? "bg-[#76D7B6]" : "bg-slate-200"}`}></div>
                    </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4 mt-6">
                    {step === 1 && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="clinicName">Nombre de la Clínica / Consultorio</Label>
                                <Input id="clinicName" name="clinicName" placeholder="Ej: Consultorios Dentales Livio" required value={formData.clinicName} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cuit">CUIT (Opcional)</Label>
                                <Input id="cuit" name="cuit" placeholder="XX-XXXXXXXX-X" value={formData.cuit} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Corporativo</Label>
                                <Input id="email" name="email" type="email" placeholder="admin@clinica.com" required value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nombre Completo</Label>
                                <Input id="fullName" name="fullName" placeholder="Dr. Juan Pérez" required value={formData.fullName} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license">Matrícula Nacional (MN)</Label>
                                <Input id="license" name="license" placeholder="Ej: 123456" required value={formData.license} onChange={handleChange} />
                            </div>

                            <div className="p-4 bg-[#76D7B6]/10 rounded-lg text-sm text-slate-600 mt-4">
                                <p className="font-semibold text-[#76D7B6] mb-1">✨ Plan Trial</p>
                                <p>Tendrás acceso total a todas las funciones premium por 14 días. Sin cargos automáticos.</p>
                            </div>
                        </>
                    )}

                    <Button type="submit" className="w-full bg-[#76D7B6] hover:bg-[#65cba8] text-white font-bold" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {step === 1 ? "Continuar" : "Crear Cuenta"}
                    </Button>
                </form>

                <div className="text-center text-sm">
                    <span className="text-slate-500">¿Ya tienes cuenta? </span>
                    <Link href="/login" className="font-semibold text-slate-900 hover:underline">
                        Iniciar Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
