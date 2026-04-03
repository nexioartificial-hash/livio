"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Send,
    Search,
    Loader2,
    MessageSquare,
    ArrowLeft,
    Bot,
    Shield,
    Zap,
    AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConnectButton } from "@/app/(app)/whatsapp-connect/ConnectButton";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { cn } from "@/lib/utils";
import {
    getWhatsAppConnection,
    getConversations,
    getMessages,
} from "@/app/actions/whatsapp";

interface WaMessage {
    id: string;
    clinic_id: string;
    phone_id: string;
    wamid: string;
    direction: "inbound" | "outbound";
    from_number: string;
    to_number: string;
    type: string;
    body: string | null;
    status: string;
    timestamp: string;
    created_at: string;
}

interface Conversation {
    phone: string;
    patientName: string | null;
    lastMessage: string;
    lastTimestamp: string;
    unread: number;
}

export default function ChatPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [messages, setMessages] = useState<WaMessage[]>([]);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState("");
    const [phoneId, setPhoneId] = useState<string | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    const [waLoaded, setWaLoaded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 1. Check WhatsApp connection via Server Action
    useEffect(() => {
        if (!user) return;
        getWhatsAppConnection()
            .then((conn) => {
                if (conn) {
                    setPhoneId(conn.phoneId);
                    setClinicId(conn.clinicId);
                }
            })
            .finally(() => setWaLoaded(true));
    }, [user]);

    // 2. Fetch conversations via Server Action
    const fetchConversations = useCallback(async () => {
        if (!clinicId) return;
        setLoadingChats(true);
        try {
            const convs = await getConversations(clinicId);
            setConversations(convs);
            if (convs.length > 0 && !selectedPhone) {
                setSelectedPhone(convs[0].phone);
            }
        } catch (error: any) {
            console.error("Error fetching conversations:", error);
        } finally {
            setLoadingChats(false);
        }
    }, [clinicId, selectedPhone]);

    useEffect(() => {
        if (phoneId && clinicId) {
            fetchConversations();
        }
    }, [phoneId, clinicId, fetchConversations]);

    // 3. Fetch messages via Server Action
    useEffect(() => {
        if (!selectedPhone || !clinicId) return;

        const fetchMsgs = async () => {
            setLoadingMessages(true);
            try {
                const data = await getMessages(clinicId, selectedPhone);
                setMessages(data as WaMessage[]);
            } catch (error: any) {
                console.error("Error fetching messages:", error);
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMsgs();

        // Poll for new messages every 5 seconds
        const interval = setInterval(async () => {
            try {
                const data = await getMessages(clinicId, selectedPhone);
                setMessages(data as WaMessage[]);
            } catch {
                // Silently ignore polling errors
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [selectedPhone, clinicId]);

    const filteredConversations = useMemo(() => {
        return conversations.filter(
            (c) =>
                (c.patientName || "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                c.phone.includes(search)
        );
    }, [conversations, search]);

    const selectedConv = useMemo(
        () => conversations.find((c) => c.phone === selectedPhone),
        [conversations, selectedPhone]
    );

    const displayName = (conv: Conversation | undefined) =>
        conv?.patientName || formatPhone(conv?.phone || "");

    function formatPhone(phone: string): string {
        if (phone.length > 10) {
            return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 8)}-${phone.slice(8)}`;
        }
        return phone;
    }

    const handleSendMessage = async () => {
        if (!message.trim() || !selectedPhone || !phoneId) return;

        setSending(true);
        try {
            const response = await fetch("/api/whatsapp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_id: phoneId,
                    to: selectedPhone,
                    type: "text",
                    message: message.trim(),
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Error al enviar mensaje");
            }

            setMessage("");
            toast.success("Mensaje enviado");

            // Refresh messages
            const updated = await getMessages(clinicId!, selectedPhone);
            setMessages(updated as WaMessage[]);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSending(false);
        }
    };

    // Loading state
    if (!waLoaded) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    // No WhatsApp connected — show setup screen
    if (!phoneId) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WhatsApp</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Conectá tu número para enviar recordatorios y recibir mensajes de pacientes con el bot de IA.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquare className="h-5 w-5 text-[#25D366]" />
                            Conectar WhatsApp Business
                        </CardTitle>
                        <CardDescription>
                            Necesitás un número de WhatsApp Business API. El proceso toma menos de 5 minutos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-3">
                            {[
                                { icon: Bot, title: "Bot con IA integrado", desc: "Responde automáticamente consultas de pacientes, agenda turnos y brinda información de la clínica." },
                                { icon: Shield, title: "Integración oficial Meta", desc: "Conexión directa con WhatsApp Business API. Sin intermediarios." },
                                { icon: Zap, title: "Recordatorios automáticos", desc: "Enviá confirmaciones y recordatorios de turnos sin intervención manual." },
                                { icon: MessageSquare, title: "Mensajes bidireccionales", desc: "Recibí y respondé mensajes de pacientes directamente desde Livio." },
                            ].map(({ icon: Icon, title, desc }) => (
                                <div key={title} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                                    <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Icon className="h-4 w-4 text-[#25D366]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-1">
                            <ConnectButton />
                            <p className="text-xs text-slate-400 mt-3">
                                Al conectar, aceptás los{" "}
                                <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                                    Términos de WhatsApp Business
                                </a>.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Requisitos previos</p>
                            <ul className="mt-1.5 space-y-1 list-disc list-inside text-xs text-amber-700 dark:text-amber-300">
                                <li>Cuenta de Meta Business Manager verificada</li>
                                <li>Número de teléfono sin WhatsApp registrado (o ya migrado a API)</li>
                                <li>Nombre de empresa aprobado por Meta</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-130px)] min-h-[500px]">
            <div className="flex items-center justify-between gap-4 shrink-0 px-1 mb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    WhatsApp
                </h1>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Bot activo
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <div className="flex h-full rounded-xl border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                    {/* Sidebar - conversations list */}
                    <div
                        className={cn(
                            "w-full lg:w-80 border-r flex flex-col shrink-0",
                            selectedPhone ? "hidden lg:flex" : "flex"
                        )}
                    >
                        <div className="p-3 border-b shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar conversación..."
                                    className="pl-9 h-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loadingChats ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                                    <MessageSquare className="h-8 w-8 opacity-30" />
                                    <p className="text-xs">
                                        No hay conversaciones
                                    </p>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <button
                                        key={conv.phone}
                                        onClick={() =>
                                            setSelectedPhone(conv.phone)
                                        }
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-all border-b last:border-0",
                                            selectedPhone === conv.phone
                                                ? "bg-accent/5 border-l-4 border-l-accent"
                                                : "border-l-4 border-l-transparent"
                                        )}
                                    >
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarFallback className="bg-accent/10 text-accent font-bold text-sm">
                                                {(
                                                    conv.patientName ||
                                                    conv.phone.slice(-2)
                                                )[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                                                    {conv.patientName ||
                                                        formatPhone(conv.phone)}
                                                </p>
                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                    {DateTime.fromISO(
                                                        conv.lastTimestamp
                                                    ).toFormat("HH:mm")}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    {conv.lastMessage}
                                                </p>
                                                {conv.unread > 0 && (
                                                    <Badge
                                                        variant="default"
                                                        className="h-5 min-w-5 flex items-center justify-center rounded-full bg-accent text-white text-[10px] px-1.5 shrink-0"
                                                    >
                                                        {conv.unread}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat area */}
                    <div
                        className={cn(
                            "flex-1 flex flex-col min-w-0",
                            !selectedPhone ? "hidden lg:flex" : "flex"
                        )}
                    >
                        {selectedConv ? (
                            <>
                                {/* Chat header */}
                                <div className="p-3 border-b flex items-center gap-3 bg-white dark:bg-slate-950 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="lg:hidden h-8 w-8 -ml-1"
                                        onClick={() =>
                                            setSelectedPhone(null)
                                        }
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarFallback className="bg-accent/10 text-accent font-bold text-sm">
                                            {(
                                                selectedConv.patientName ||
                                                selectedConv.phone.slice(-2)
                                            )[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                            {displayName(selectedConv)}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                                            {formatPhone(selectedConv.phone)}
                                        </p>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                                    {loadingMessages ? (
                                        <div className="flex justify-center p-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-accent" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-50">
                                            <MessageSquare className="h-8 w-8" />
                                            <p className="text-xs">
                                                No hay mensajes aún
                                            </p>
                                        </div>
                                    ) : (
                                        messages.map((msg) => {
                                            const isOutbound =
                                                msg.direction === "outbound";
                                            return (
                                                <div
                                                    key={msg.id || msg.wamid}
                                                    className={cn(
                                                        "flex",
                                                        isOutbound
                                                            ? "justify-end"
                                                            : "justify-start"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                            isOutbound
                                                                ? "bg-accent text-white rounded-br-sm"
                                                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm border"
                                                        )}
                                                    >
                                                        {isOutbound && (
                                                            <div className="flex items-center gap-1 mb-1 opacity-70">
                                                                <Bot className="h-3 w-3" />
                                                                <span className="text-[10px]">
                                                                    Bot
                                                                </span>
                                                            </div>
                                                        )}
                                                        <p className="leading-relaxed whitespace-pre-wrap">
                                                            {msg.body || `[${msg.type}]`}
                                                        </p>
                                                        <div className="flex items-center justify-end gap-1 mt-1">
                                                            <span
                                                                className={cn(
                                                                    "text-[10px]",
                                                                    isOutbound
                                                                        ? "text-white/60"
                                                                        : "text-slate-400"
                                                                )}
                                                            >
                                                                {DateTime.fromISO(
                                                                    msg.timestamp ||
                                                                        msg.created_at
                                                                ).toFormat(
                                                                    "HH:mm"
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message input */}
                                <div className="p-3 border-t bg-white dark:bg-slate-950 shrink-0">
                                    <form
                                        className="flex gap-2 items-end"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }}
                                    >
                                        <Input
                                            placeholder="Escribe un mensaje..."
                                            value={message}
                                            onChange={(e) =>
                                                setMessage(e.target.value)
                                            }
                                            className="h-10 text-sm flex-1"
                                            disabled={sending}
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            className="h-10 w-10 bg-accent hover:bg-accent/90 text-white shrink-0"
                                            disabled={
                                                !message.trim() || sending || !phoneId
                                            }
                                        >
                                            {sending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
                                <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-900 border">
                                    <MessageSquare className="h-10 w-10 opacity-20" />
                                </div>
                                <p className="text-sm font-medium">
                                    Selecciona un chat para comenzar
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
