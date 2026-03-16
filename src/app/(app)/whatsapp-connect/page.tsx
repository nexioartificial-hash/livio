/**
 * /whatsapp-connect — Server Component
 * Muestra estado de la conexión WhatsApp Business de la clínica.
 * Si no hay conexión → muestra el botón ConnectButton (Embedded Signup).
 * Si ya está conectado → muestra datos + acceso a configuración.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageSquare, Shield, Zap, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ConnectButton } from "./ConnectButton";

async function getConnection(userId: string) {
    const admin = createAdminClient();
    const { data } = await admin
        .from("user_whatsapps")
        .select("waba_id, phone_id, display_number, verified_name, status, created_at")
        .eq("user_id", userId)
        .single();
    return data;
}

export default async function WhatsAppConnectPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const connection = user ? await getConnection(user.id) : null;

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">WhatsApp Business</h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Conectá tu número para enviar recordatorios y recibir mensajes de pacientes desde Livio.
                </p>
            </div>

            {connection ? (
                /* ── CONECTADO ─────────────────────────────────── */
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{connection.verified_name}</p>
                                    <p className="text-sm text-slate-600">{connection.display_number}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Conectado · WABA {connection.waba_id}
                                    </p>
                                </div>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 shrink-0">
                                Activo
                            </Badge>
                        </div>
                        <div className="mt-4 flex gap-2 flex-wrap">
                            <Button asChild size="sm" className="bg-[#25D366] hover:bg-[#1ebe5d] text-white">
                                <Link href="/whatsapp-success">Ver configuración y QR</Link>
                            </Button>
                            <form action="/api/auth/whatsapp/disconnect" method="POST">
                                <Button
                                    type="submit"
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-200 hover:bg-red-50"
                                >
                                    Desconectar
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* ── NO CONECTADO ──────────────────────────────── */
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MessageSquare className="h-5 w-5 text-[#25D366]" />
                                Conectar número
                            </CardTitle>
                            <CardDescription>
                                Necesitás un número de WhatsApp Business API. El proceso toma menos de 5 minutos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-3">
                                {[
                                    {
                                        icon: Shield,
                                        title: "Integración oficial Meta",
                                        desc: "Conexión directa con WhatsApp Business API. Sin intermediarios.",
                                    },
                                    {
                                        icon: Zap,
                                        title: "Recordatorios automáticos",
                                        desc: "Enviá confirmaciones y recordatorios de turnos sin intervención manual.",
                                    },
                                    {
                                        icon: MessageSquare,
                                        title: "Mensajes bidireccionales",
                                        desc: "Recibí y respondé mensajes de pacientes directamente desde Livio.",
                                    },
                                ].map(({ icon: Icon, title, desc }) => (
                                    <div key={title} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                                        <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon className="h-4 w-4 text-[#25D366]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{title}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-1">
                                <ConnectButton />
                                <p className="text-xs text-slate-400 mt-3">
                                    Al conectar, aceptás los{" "}
                                    <a
                                        href="https://www.whatsapp.com/legal/business-policy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:text-slate-600"
                                    >
                                        Términos de WhatsApp Business
                                    </a>
                                    .
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4 flex items-start gap-3">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">Requisitos previos</p>
                                <ul className="mt-1.5 space-y-1 list-disc list-inside text-xs text-amber-700">
                                    <li>Cuenta de Meta Business Manager verificada</li>
                                    <li>Número de teléfono sin WhatsApp registrado (o ya migrado a API)</li>
                                    <li>Nombre de empresa aprobado por Meta</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
