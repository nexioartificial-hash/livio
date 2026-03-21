"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ExternalLink } from "lucide-react";
import { getEmailProviderUrl, maskEmail } from "@/lib/email/templates";

function CheckEmailContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const maskedEmail = email ? maskEmail(email) : "";
    const providerUrl = email ? getEmailProviderUrl(email) : null;

    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [resendCount, setResendCount] = useState(0);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleResend = async () => {
        if (cooldown > 0 || resending || resendCount >= 3) return;
        setResending(true);

        try {
            await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setResendCount(c => c + 1);
            setCooldown(60);
        } catch {
            // Silent
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 px-8 py-10 text-center">
                <Image src="/logo-transparent.png" alt="Livio" width={100} height={40} className="mx-auto mb-6" />

                <div className="h-16 w-16 rounded-full bg-[#76D7B6]/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-[#76D7B6]" />
                </div>

                <h2 className="text-xl font-bold text-slate-900">¡Revisá tu email!</h2>
                <p className="mt-3 text-sm text-slate-500">
                    Enviamos un link de verificación a:
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{maskedEmail}</p>
                <p className="mt-3 text-sm text-slate-500">
                    Hacé click en el link del email para activar tu cuenta.
                </p>

                {providerUrl && (
                    <a href={providerUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full mt-5 bg-[#76D7B6] hover:bg-[#65cba8] text-white font-bold">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir mi email
                        </Button>
                    </a>
                )}

                <div className="mt-6 pt-5 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-3">¿No encontrás el email?</p>
                    <ul className="text-xs text-slate-400 text-left space-y-1 mb-4 list-disc list-inside">
                        <li>Revisá la carpeta de spam o correo no deseado</li>
                        <li>Verificá que el email sea correcto</li>
                    </ul>

                    {resendCount >= 3 ? (
                        <p className="text-xs text-slate-500">
                            Si seguís sin recibirlo, contactanos a{" "}
                            <a href="mailto:soporte@liviodental.com" className="text-[#76D7B6] underline">
                                soporte@liviodental.com
                            </a>
                        </p>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResend}
                            disabled={cooldown > 0 || resending}
                            className="text-xs"
                        >
                            {resending ? (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : null}
                            {cooldown > 0
                                ? `Reenviar en ${cooldown}s`
                                : "Reenviar email de verificación"
                            }
                        </Button>
                    )}
                </div>

                <p className="mt-5 text-[11px] text-slate-400">
                    El link expira en 24 horas.
                </p>
                <Link href="/login" className="block mt-2 text-xs text-slate-500 hover:text-slate-700">
                    ← Volver al login
                </Link>
            </div>
        </div>
    );
}

export default function CheckEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        }>
            <CheckEmailContent />
        </Suspense>
    );
}
