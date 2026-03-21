"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordReset } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed) return;

        setLoading(true);
        try {
            await requestPasswordReset(trimmed);
            setSent(true);
        } catch {
            toast.error("Error de conexión. Intentá de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 px-8 py-8">
                {sent ? (
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-[#76D7B6]/20 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-[#76D7B6]" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Revisá tu email</h2>
                        <p className="text-sm text-slate-500">
                            Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.
                        </p>
                        <Link href="/login">
                            <Button variant="outline" className="mt-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al login
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col items-center text-center mb-6">
                            <Image
                                src="/logo-transparent.png"
                                alt="Livio"
                                width={100}
                                height={40}
                                className="mb-4"
                            />
                            <h2 className="text-xl font-bold tracking-tight text-slate-900">
                                ¿Olvidaste tu contraseña?
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Ingresá tu email y te enviaremos instrucciones
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="doctor@ejemplo.com"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Enviar instrucciones
                            </Button>
                        </form>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
                                <ArrowLeft className="inline h-3 w-3 mr-1" />
                                Volver al login
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
