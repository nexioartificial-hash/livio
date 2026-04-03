"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { validatePassword, getStrengthLabel } from "@/lib/security/password-validator";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();

    // Supabase sends the user here with a session already established via the reset link
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setSessionReady(true);
            }
        });

        // Also check if we already have a session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setSessionReady(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const validation = validatePassword(password);
    const strength = getStrengthLabel(validation.score);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validation.valid) {
            toast.error("La contraseña no cumple los requisitos");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                toast.error("Error al cambiar la contraseña: " + error.message);
            } else {
                setSuccess(true);
                setTimeout(() => router.push("/dashboard"), 3000);
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    if (!sessionReady) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 px-8 py-8">
                {success ? (
                    <div className="flex flex-col items-center text-center space-y-4">
                        <CheckCircle className="h-12 w-12 text-accent" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Contraseña actualizada</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Redirigiendo al dashboard...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col items-center text-center mb-6">
                            <Image src="/logo-transparent.png" alt="Livio" width={100} height={40} className="mb-4" />
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Nueva contraseña
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Elegí una contraseña segura para tu cuenta
                            </p>
                        </div>

                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Nueva contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {/* Password strength indicator */}
                                {password && (
                                    <div className="space-y-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div
                                                    key={i}
                                                    className="h-1 flex-1 rounded-full"
                                                    style={{ backgroundColor: i <= validation.score ? strength.color : "#e2e8f0" }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                                        {validation.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-red-500">{err}</p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-slate-900 hover:bg-slate-800"
                                disabled={loading || !validation.valid || password !== confirmPassword}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Cambiar contraseña
                            </Button>
                        </form>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-300">
                                Volver al login
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
