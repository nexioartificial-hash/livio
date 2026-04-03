"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

export function TestSendButton({ phoneId }: { phoneId: string }) {
    const [to, setTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async () => {
        const clean = to.trim().replace(/\D/g, "");
        if (!clean) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/whatsapp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_id: phoneId,
                    to: clean,
                    type: "text",
                    message:
                        "¡Hola! Este es un mensaje de prueba desde Livio 🦷. " +
                        "Tu clínica ya puede enviarte recordatorios y confirmaciones de turnos por WhatsApp.",
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Error al enviar el mensaje");
                return;
            }

            setSent(true);
        } catch {
            setError("Error de red. Verificá tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Mensaje enviado correctamente. Revisá el teléfono.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Ingresá un número con código de país, sin + ni espacios (ej: <strong>5491112345678</strong>)
            </p>
            <div className="flex gap-2">
                <Input
                    type="tel"
                    placeholder="549111..."
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="max-w-xs"
                />
                <Button
                    onClick={handleSend}
                    disabled={loading || !to.trim()}
                    className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2 shrink-0"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                    Enviar
                </Button>
            </div>
            {error && <p className="text-sm text-red-500">⚠ {error}</p>}
        </div>
    );
}
