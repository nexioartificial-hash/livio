"use client";

/**
 * ConnectButton — carga el SDK de Facebook e inicia el Embedded Signup de Meta.
 * Al completar el flow, envía el code al backend (/api/auth/whatsapp/callback)
 * y redirige a /whatsapp-success.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_META_APP_ID
 *   NEXT_PUBLIC_META_CONFIG_ID  (Meta App > WhatsApp > Embedded Signup)
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID!;
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID!;

function loadFBSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window.FB !== "undefined") { resolve(); return; }

        const timeout = setTimeout(() => reject(new Error("Timeout cargando SDK de Facebook")), 10000);

        window.fbAsyncInit = () => {
            clearTimeout(timeout);
            window.FB.init({ appId: APP_ID, cookie: true, xfbml: false, version: "v21.0" });
            resolve();
        };

        const existing = document.getElementById("facebook-jssdk");
        if (existing) return;

        const script = document.createElement("script");
        script.id = "facebook-jssdk";
        script.src = "https://connect.facebook.net/es_LA/sdk.js";
        script.async = true;
        script.defer = true;
        script.onerror = () => { clearTimeout(timeout); reject(new Error("No se pudo cargar el SDK de Facebook")); };
        document.body.appendChild(script);
    });
}

export function ConnectButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await loadFBSDK();
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
            return;
        }

        // FB.login callback must be synchronous — call async handler inside
        const handleFBResponse = (response: any) => {
            const code = response.authResponse?.code;

            if (!code) {
                setError(
                    response.status === "unknown"
                        ? "Cerró la ventana sin completar. Intentá de nuevo."
                        : "No se obtuvo autorización de Meta."
                );
                setLoading(false);
                return;
            }

            fetch("/api/auth/whatsapp/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            })
                .then((res) => res.json().then((data) => ({ res, data })))
                .then(({ res, data }) => {
                    if (!res.ok) {
                        setError(data.error || "Error al conectar WhatsApp. Intentá de nuevo.");
                        setLoading(false);
                        return;
                    }
                    console.log("[WA] Connected:", data.display_number);
                    router.push("/whatsapp-success");
                })
                .catch(() => {
                    setError("Error de red. Verificá tu conexión e intentá de nuevo.");
                    setLoading(false);
                });
        };

        window.FB.login(handleFBResponse, {
            config_id: CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: {
                setup: {},
                featureType: "",
                sessionInfoVersion: "3",
            },
        });
    }, [router]);

    return (
        <div className="space-y-2">
            <Button
                onClick={handleConnect}
                disabled={loading}
                size="lg"
                className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2 w-full sm:w-auto"
            >
                {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Conectando...</>
                ) : (
                    <><MessageSquare className="h-4 w-4" /> Conectar WhatsApp Business</>
                )}
            </Button>
            {error && (
                <p className="text-sm text-red-500 flex items-start gap-1">
                    <span className="shrink-0 mt-0.5">⚠</span> {error}
                </p>
            )}
        </div>
    );
}
