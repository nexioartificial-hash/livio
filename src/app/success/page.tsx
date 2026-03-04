"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export default function SuccessPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Trigger confetti
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#76D7B6', '#65cba8', '#25D366']
        });

        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-none shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 bg-[#76D7B6]/10 w-20 h-20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-[#76D7B6]" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                        ¡PLAN PRO ACTIVADO! <Sparkles className="h-5 w-5 text-yellow-500" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6 pt-4">
                    <p className="text-slate-500">
                        Tu suscripción se ha procesado correctamente. Ahora tienes acceso a
                        <strong> pacientes ilimitados</strong>, campañas de WhatsApp y todas las funciones PRO de Livio.
                    </p>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#76D7B6] animate-ping" />
                        <span className="text-sm font-medium text-slate-700">Estado: Activo ✅</span>
                    </div>

                    <Button
                        onClick={() => router.push("/dashboard")}
                        className="w-full bg-[#76D7B6] hover:bg-[#65cba8] text-white font-bold h-12 shadow-lg hover:shadow-xl transition-all"
                    >
                        IR AL DASHBOARD
                    </Button>

                    <p className="text-[10px] text-slate-400">
                        Serás redirigido automáticamente en unos segundos...
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
