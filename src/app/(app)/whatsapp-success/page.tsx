/**
 * /whatsapp-success — Server Component
 * Muestra:
 *  - Datos del número conectado
 *  - QR para coexistencia (vincular la app de WA Business al número de API)
 *  - Instrucciones de escaneo
 *  - Botón de prueba de envío
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, QrCode, MessageSquare, Smartphone, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TestSendButton } from "./TestSendButton";

interface WAConnection {
    phone_id: string;
    display_number: string;
    verified_name: string;
    waba_id: string;
    status: string;
}

async function getConnection(): Promise<WAConnection | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data } = await admin
        .from("user_whatsapps")
        .select("phone_id, display_number, verified_name, waba_id, status")
        .eq("user_id", user.id)
        .single();

    return data;
}

interface QRResult {
    qr_image_url?: string;
    qr_code?: string;          // SVG string
    deep_link_url?: string;
    error?: string;
}

async function fetchQR(phoneId: string): Promise<QRResult> {
    try {
        const admin = createAdminClient();
        const { data: conn } = await admin
            .from("user_whatsapps")
            .select("access_token")
            .eq("phone_id", phoneId)
            .single();

        if (!conn?.access_token) return { error: "No disponible" };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const metaRes = await fetch(
            `https://graph.facebook.com/v21.0/${phoneId}/generate_qr_code?generate_qr_image=SVG&messaging_product=whatsapp`,
            {
                headers: { Authorization: `Bearer ${conn.access_token}` },
                cache: "no-store",
                signal: controller.signal,
            }
        );
        clearTimeout(timeout);

        const data = await metaRes.json();
        if (data.error) return { error: data.error.message ?? "No disponible" };

        return {
            qr_image_url: data.qr_image_url ?? null,
            qr_code: data.code ?? null,
            deep_link_url: data.deep_link_url ?? null,
        };
    } catch {
        return { error: "No disponible" };
    }
}

export default async function WhatsAppSuccessPage() {
    const connection = await getConnection();
    if (!connection) redirect("/whatsapp-connect");

    const qr = await fetchQR(connection.phone_id);

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">¡WhatsApp conectado!</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Tu número está activo y listo para usar en Livio.</p>
                </div>
            </div>

            {/* Número */}
            <Card className="border-emerald-200 bg-emerald-50/40">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Número verificado</p>
                        <p className="font-bold text-slate-900 dark:text-white text-xl tracking-wide">
                            {connection.display_number}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{connection.verified_name}</p>
                        <p className="text-xs text-slate-400 mt-1">WABA ID: {connection.waba_id}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 shrink-0">Activo</Badge>
                </CardContent>
            </Card>

            {/* QR de coexistencia */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        Código QR — Vincular dispositivo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-6 items-start">
                        {/* QR image */}
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center justify-center w-40 h-40 shrink-0">
                            {qr.qr_image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={qr.qr_image_url}
                                    alt="QR WhatsApp Business"
                                    className="w-full h-full object-contain"
                                />
                            ) : qr.qr_code ? (
                                <div
                                    className="w-full h-full"
                                    dangerouslySetInnerHTML={{ __html: qr.qr_code }}
                                />
                            ) : (
                                <div className="text-center space-y-2">
                                    <QrCode className="h-10 w-10 text-slate-300 mx-auto" />
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                        {qr.error ?? "No disponible"}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Instructions */}
                        <div className="space-y-3 flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Smartphone className="h-4 w-4 text-slate-400" />
                                Cómo escanear
                            </p>
                            <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal list-inside">
                                <li>Abrí <strong>WhatsApp Business</strong> en tu celular</li>
                                <li>Tocá los tres puntos <strong>⋮</strong> → <strong>Dispositivos vinculados</strong></li>
                                <li>Tocá <strong>Vincular un dispositivo</strong></li>
                                <li>Escaneá este código QR con la cámara</li>
                            </ol>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-[10px] text-amber-700 leading-snug">
                                <strong>Coexistencia:</strong> al vincular, tu número de API puede usarse
                                simultáneamente en la app de WhatsApp Business y desde Livio.
                            </div>
                            {qr.deep_link_url && (
                                <a
                                    href={qr.deep_link_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#25D366] underline block"
                                >
                                    Abrir en WhatsApp →
                                </a>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Test send */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-[#25D366]" />
                        Probar envío
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TestSendButton phoneId={connection.phone_id} />
                </CardContent>
            </Card>

            <Button variant="outline" asChild className="gap-2">
                <Link href="/whatsapp-connect">
                    <ArrowLeft className="h-4 w-4" /> Volver a configuración
                </Link>
            </Button>
        </div>
    );
}
