"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Bot,
    MessageSquare,
    Clock,
    Save,
    Loader2,
    XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface BotConfig {
    id: string;
    clinic_id: string;
    phone_id: string;
    enabled: boolean;
    greeting_message: string;
    out_of_hours_message: string;
    bot_hours_start: string;
    bot_hours_end: string;
    bot_active_days: number[];
    ai_model: string;
    system_prompt_extra: string | null;
}

interface WhatsAppConnection {
    phone_id: string;
    display_number: string;
    verified_name: string;
    status: string;
}

const DAYS = [
    { value: 0, label: "Dom" },
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mié" },
    { value: 4, label: "Jue" },
    { value: 5, label: "Vie" },
    { value: 6, label: "Sáb" },
];

export default function WhatsAppBotTab({ clinicId }: { clinicId: string }) {
    const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
    const [config, setConfig] = useState<BotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [clinicId]);

    async function loadData() {
        setLoading(true);

        // Load WhatsApp connection
        const { data: conn } = await supabase
            .from("user_whatsapps")
            .select("phone_id, display_number, verified_name, status")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .limit(1)
            .single();

        setConnection(conn);

        if (conn?.phone_id) {
            // Load bot config
            const { data: botConfig } = await supabase
                .from("whatsapp_bot_config")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("phone_id", conn.phone_id)
                .single();

            setConfig(botConfig);
        }

        setLoading(false);
    }

    async function handleSave() {
        if (!config) return;
        setSaving(true);

        const { error } = await supabase
            .from("whatsapp_bot_config")
            .update({
                enabled: config.enabled,
                greeting_message: config.greeting_message,
                out_of_hours_message: config.out_of_hours_message,
                bot_hours_start: config.bot_hours_start,
                bot_hours_end: config.bot_hours_end,
                bot_active_days: config.bot_active_days,
                system_prompt_extra: config.system_prompt_extra,
                updated_at: new Date().toISOString(),
            })
            .eq("id", config.id);

        setSaving(false);

        if (error) {
            toast.error("Error al guardar la configuración");
            console.error(error);
        } else {
            toast.success("Configuración guardada");
        }
    }

    function toggleDay(day: number) {
        if (!config) return;
        const days = config.bot_active_days.includes(day)
            ? config.bot_active_days.filter((d) => d !== day)
            : [...config.bot_active_days, day].sort();
        setConfig({ ...config, bot_active_days: days });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!connection) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                        Primero conectá tu número de WhatsApp Business en la sección de{" "}
                        <a href="/whatsapp-connect" className="text-primary underline">
                            Integraciones
                        </a>
                        .
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!config) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                        No se encontró configuración del bot. Intentá reconectar tu WhatsApp.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                WhatsApp Conectado
                            </CardTitle>
                            <CardDescription>
                                {connection.verified_name} — {connection.display_number}
                            </CardDescription>
                        </div>
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                            {config.enabled ? "Bot Activo" : "Bot Inactivo"}
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {/* Bot Toggle */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Asistente Virtual
                    </CardTitle>
                    <CardDescription>
                        Configurá el bot que responde automáticamente a los pacientes por
                        WhatsApp.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Enable/Disable */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Bot habilitado</Label>
                            <p className="text-sm text-muted-foreground">
                                El bot responde automáticamente a los mensajes entrantes
                            </p>
                        </div>
                        <Switch
                            checked={config.enabled}
                            onCheckedChange={(checked) =>
                                setConfig({ ...config, enabled: checked })
                            }
                        />
                    </div>

                    {/* Greeting */}
                    <div className="space-y-2">
                        <Label>Mensaje de saludo</Label>
                        <Textarea
                            value={config.greeting_message}
                            onChange={(e) =>
                                setConfig({ ...config, greeting_message: e.target.value })
                            }
                            rows={2}
                            placeholder="¡Hola! Soy el asistente virtual..."
                        />
                    </div>

                    {/* Out of hours */}
                    <div className="space-y-2">
                        <Label>Mensaje fuera de horario</Label>
                        <Textarea
                            value={config.out_of_hours_message}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    out_of_hours_message: e.target.value,
                                })
                            }
                            rows={2}
                            placeholder="Gracias por escribirnos. Estamos fuera de horario..."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Horario del Bot
                    </CardTitle>
                    <CardDescription>
                        Fuera de este horario se envía el mensaje de &quot;fuera de horario&quot;.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="space-y-2">
                            <Label>Desde</Label>
                            <Input
                                type="time"
                                value={config.bot_hours_start}
                                onChange={(e) =>
                                    setConfig({ ...config, bot_hours_start: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hasta</Label>
                            <Input
                                type="time"
                                value={config.bot_hours_end}
                                onChange={(e) =>
                                    setConfig({ ...config, bot_hours_end: e.target.value })
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Días activos</Label>
                        <div className="flex gap-2">
                            {DAYS.map((d) => (
                                <Button
                                    key={d.value}
                                    variant={
                                        config.bot_active_days.includes(d.value)
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => toggleDay(d.value)}
                                >
                                    {d.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Extra Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle>Instrucciones Adicionales</CardTitle>
                    <CardDescription>
                        Agregá instrucciones extra para personalizar el comportamiento del
                        bot. Por ejemplo: &quot;No ofrecer turnos los sábados después de las
                        13hs&quot;.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={config.system_prompt_extra ?? ""}
                        onChange={(e) =>
                            setConfig({
                                ...config,
                                system_prompt_extra: e.target.value || null,
                            })
                        }
                        rows={3}
                        placeholder="Instrucciones opcionales..."
                    />
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Configuración
                </Button>
            </div>
        </div>
    );
}
