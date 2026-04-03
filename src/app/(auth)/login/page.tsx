"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { preLoginCheck, postLoginResult } from "@/app/actions/auth";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const router = useRouter();

    // Client-side email format validation
    const validateEmail = useCallback((value: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        return emailRegex.test(value.trim());
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setFieldErrors({});

        // Client-side validation (UX only — server validates too)
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !validateEmail(trimmedEmail)) {
            setFieldErrors({ email: "Ingresá un email válido" });
            return;
        }
        if (!password) {
            setFieldErrors({ password: "Ingresá tu contraseña" });
            return;
        }

        setLoading(true);

        try {
            // 1. Server-side rate limit and lockout check
            const preCheck = await preLoginCheck(trimmedEmail);
            if (!preCheck.allowed) {
                toast.error(preCheck.error || "Demasiados intentos");
                setLoading(false);
                return;
            }

            // 2. Set session duration preference
            document.cookie = `livio_remember_me=${rememberMe ? 'true' : 'false'}; path=/; max-age=315360000; SameSite=Lax`;

            // 3. Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password,
            });

            // 4. Log result server-side (audit + lockout escalation)
            if (error) {
                const postResult = await postLoginResult(trimmedEmail, false);

                // Generic error message — never reveal if email exists or not
                if (postResult.locked) {
                    toast.error(postResult.lockoutMessage || "Cuenta bloqueada temporalmente");
                } else {
                    toast.error("Credenciales incorrectas");
                }

                // Clear password field after failed attempt
                setPassword("");
                setLoading(false);
            } else {
                await postLoginResult(trimmedEmail, true, data.user?.id);
                toast.success("¡Bienvenido de nuevo!");
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            toast.error("Error de conexión. Intentá de nuevo.");
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            toast.error("Error con Google: " + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left side — image */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <Image
                    src="/login-bg.png"
                    alt="Consultorio dental"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
                {/* Marketing copy */}
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-10">
                    <Image
                        src="/logo-transparent.png"
                        alt="Livio"
                        width={120}
                        height={48}
                        className="brightness-0 invert mb-8"
                    />
                    <h1 className="text-4xl font-bold text-white leading-tight drop-shadow-lg">
                        Gestión dental<br />potenciada con <span className="text-accent">IA</span>.
                    </h1>
                    <p className="text-white/85 text-lg max-w-xs mt-4 drop-shadow-md mx-auto">
                        Automatiza tu agenda, historia clínica y comunicación con pacientes.
                    </p>
                    <div className="flex items-center gap-6 mt-8">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">+500</p>
                            <p className="text-white/70 text-xs">Profesionales</p>
                        </div>
                        <div className="h-8 w-px bg-white dark:bg-slate-950/30" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">30 días</p>
                            <p className="text-white/70 text-xs">Prueba gratis</p>
                        </div>
                        <div className="h-8 w-px bg-white dark:bg-slate-950/30" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">24/7</p>
                            <p className="text-white/70 text-xs">Soporte</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side — login form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
                <div className="w-full max-w-sm space-y-4 bg-white dark:bg-slate-950 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.25),0_8px_20px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 px-8 py-8">
                    <div className="flex flex-col items-center text-center">
                        <Image
                            src="/logo-transparent.png"
                            alt="Livio"
                            width={110}
                            height={45}
                            className="mb-3"
                        />
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Bienvenido a Livio
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Ingresa a tu cuenta para gestionar tu clínica
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-3 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="doctor@ejemplo.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                            />
                            {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Contraseña</Label>
                                <Link href="/forgot-password" className="text-xs text-accent hover:underline">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
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
                        </div>

                        <div className="flex items-center space-x-2 pt-0.5 pb-1">
                            <input
                                type="checkbox"
                                id="remember"
                                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <Label htmlFor="remember" className="text-sm font-normal text-slate-600 dark:text-slate-400 cursor-pointer">
                                Mantener sesión iniciada
                            </Label>
                        </div>

                        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Ingresar
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-400">O continuar con</span>
                        </div>
                    </div>

                    <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Google
                    </Button>

                    <div className="text-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">¿No tienes cuenta? </span>
                        <Link href="/register" className="font-semibold text-accent hover:underline">
                            Comenzar Prueba Gratis
                        </Link>
                    </div>

                    <p className="text-[11px] text-center text-slate-400 pt-1">
                        30 días gratis • Sin tarjeta • Cancelación en cualquier momento
                    </p>
                </div>
            </div>
        </div>
    );
}
