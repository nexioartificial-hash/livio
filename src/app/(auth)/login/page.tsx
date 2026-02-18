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

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error("Error al iniciar sesión: " + error.message);
            setLoading(false);
        } else {
            toast.success("¡Bienvenido de nuevo!");
            router.push("/dashboard");
            router.refresh();
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-300">
                <div className="flex flex-col items-center text-center">
                    <Image
                        src="/logo-transparent.png"
                        alt="Livio"
                        width={120}
                        height={50}
                        className="mb-6"
                    />
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Bienvenido a Livio
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Ingresa a tu cuenta para gestionar tu clínica
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 mt-8">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="doctor@ejemplo.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Contraseña</Label>
                            <Link href="#" className="text-xs text-[#76D7B6] hover:underline">
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
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Ingresar
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">O continuar con</span>
                    </div>
                </div>

                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                    </svg>
                    Google
                </Button>

                <div className="text-center text-sm">
                    <span className="text-slate-500">¿No tienes cuenta? </span>
                    <Link href="/register" className="font-semibold text-[#76D7B6] hover:underline">
                        Comenzar Prueba Gratis
                    </Link>
                </div>
            </div>

            <p className="mt-8 text-xs text-center text-slate-400">
                14 días gratis • Sin tarjeta de crédito • Cancelación en cualquier momento
            </p>
        </div>
    );
}
