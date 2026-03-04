"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Send, Phone, FileText } from "lucide-react";
import { toast } from "sonner";

export default function TestWhatsApp() {
    const [to, setTo] = useState("");
    const [body, setBody] = useState("¡Test Livio SaaS Dental - Cita confirmada!");
    const [type, setType] = useState<"text" | "template">("text");
    const [loading, setLoading] = useState(false);

    const send = async () => {
        if (type === "text" && !body.trim()) {
            toast.error("El mensaje no puede estar vacío");
            return;
        }

        setLoading(true);
        try {
            const payload: any = { to, type };
            if (type === "text") {
                payload.body = body;
            } else {
                payload.template = {
                    name: "hello_world",
                    language: { code: "en_US" }
                };
            }

            const res = await fetch("/api/send-whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.messages?.[0]?.id) {
                toast.success(`¡Enviado con éxito! ID: ${data.messages[0].id}`);
            } else {
                console.error("Error API WhatsApp:", JSON.stringify(data, null, 2));
                toast.error(`Error: ${data.error?.message || "Error desconocido"}`);
            }
        } catch (error: any) {
            toast.error("Error de conexión: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <Card className="border-slate-200 shadow-xl overflow-hidden rounded-[2rem]">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-900">WhatsApp Test</CardTitle>
                    </div>
                    <CardDescription className="text-slate-500 font-medium whitespace-pre-wrap">
                        Utilidad para probar el envío de notificaciones vía WhatsApp Business API.
                        Phone ID: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">935474726325053</code>
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="to" className="text-slate-600 font-bold ml-1 flex items-center gap-2">
                            <Phone className="h-4 w-4" /> Número Destinatario
                        </Label>
                        <Input
                            id="to"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="+541150634710 (Default if empty)"
                            className="h-12 rounded-xl bg-white focus:ring-green-500"
                        />
                        <p className="text-[10px] text-slate-400 font-medium ml-1">
                            Debe incluir código de país (ej: +549...).
                        </p>
                    </div>

                    <Tabs value={type} onValueChange={(v) => setType(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 p-1 bg-slate-100">
                            <TabsTrigger value="text" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-green-600">
                                Texto Libre
                            </TabsTrigger>
                            <TabsTrigger value="template" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600">
                                Plantilla (Hello World)
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="text" className="mt-4 space-y-2">
                            <Label htmlFor="body" className="text-slate-600 font-bold ml-1">Mensaje de Notificación</Label>
                            <Textarea
                                id="body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Tu mensaje aquí..."
                                rows={4}
                                className="rounded-xl bg-white resize-none focus:ring-green-500"
                            />
                        </TabsContent>

                        <TabsContent value="template" className="mt-4">
                            <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-blue-900 leading-none">Template: hello_world</p>
                                    <p className="text-xs text-blue-700 mt-2 leading-relaxed">
                                        Este es el mensaje de bienvenida estándar de Meta. Se usa para verificar que el número esté correctamente registrado y pueda recibir mensajes sin iniciar conversación.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button
                        onClick={send}
                        disabled={loading}
                        className={`w-full h-12 rounded-xl text-white font-black shadow-lg transition-all flex items-center justify-center gap-2 ${type === "text"
                            ? "bg-[#25D366] hover:bg-[#128C7E] shadow-green-200"
                            : "bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 shadow-blue-200"
                            }`}
                    >
                        {loading ? "Enviando..." : (
                            <>
                                <Send className="h-4 w-4" /> Enviar {type === "text" ? "WhatsApp" : "Plantilla"}
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
