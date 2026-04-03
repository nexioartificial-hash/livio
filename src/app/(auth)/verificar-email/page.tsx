"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Suspense } from "react";

type VerifyState = "loading" | "success" | "expired" | "invalid" | "already-verified";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const [state, setState] = useState<VerifyState>("loading");
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    useEffect(() => {
        const token = searchParams.get("token");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        // Supabase sends token_hash + type for email confirmations
        if (tokenHash && type === "signup") {
            // Supabase handles this via the auth callback — redirect there
            window.location.href = `/auth/callback?token_hash=${tokenHash}&type=${type}`;
            return;
        }

        if (!token) {
            setState("invalid");
            return;
        }

        // Verify via our API
        fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setState(data.alreadyVerified ? "already-verified" : "success");
                } else if (data.code === "TOKEN_EXPIRED") {
                    setState("expired");
                } else {
                    setState("invalid");
                }
            })
            .catch(() => setState("invalid"));
    }, [searchParams]);

    const handleResend = async () => {
        setResending(true);
        try {
            const email = searchParams.get("email");
            if (email) {
                await fetch("/api/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
            }
            setResent(true);
        } catch {
            // Silent fail
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 px-8 py-10 text-center">
                <Image src="/logo-transparent.png" alt="Livio" width={100} height={40} className="mx-auto mb-6" />

                {state === "loading" && (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verificando tu email...</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Un momento, por favor.</p>
                    </>
                )}

                {state === "success" && (
                    <>
                        <CheckCircle className="h-14 w-14 text-accent mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">¡Tu cuenta está verificada!</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ya podés empezar a usar Livio.</p>
                        <Link href="/login">
                            <Button className="w-full mt-6 bg-accent hover:bg-accent/90 text-white font-bold">
                                Iniciar Sesión
                            </Button>
                        </Link>
                    </>
                )}

                {state === "already-verified" && (
                    <>
                        <CheckCircle className="h-14 w-14 text-accent mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tu email ya estaba verificado</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Podés iniciar sesión normalmente.</p>
                        <Link href="/login">
                            <Button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white">
                                Iniciar Sesión
                            </Button>
                        </Link>
                    </>
                )}

                {state === "expired" && (
                    <>
                        <AlertTriangle className="h-14 w-14 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">El link expiró</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {resent ? "Te enviamos un nuevo link a tu email." : "El link de verificación expiró. Solicitá uno nuevo."}
                        </p>
                        {!resent && (
                            <Button
                                onClick={handleResend}
                                disabled={resending}
                                className="w-full mt-6 bg-accent hover:bg-accent/90 text-white font-bold"
                            >
                                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Reenviar email de verificación
                            </Button>
                        )}
                        <Link href="/login" className="block mt-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-300">
                            Volver al login
                        </Link>
                    </>
                )}

                {state === "invalid" && (
                    <>
                        <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Link no válido</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            El link de verificación no es válido o ya fue utilizado. Verificá que hayas copiado el link completo.
                        </p>
                        <Link href="/login">
                            <Button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white">
                                Ir al login
                            </Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
