"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Search, Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { DateTime } from "luxon";

export default function ChatPage() {
    const { user } = useAuth();
    const supabase = createClient();
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 1. Fetch patients (conversations)
    useEffect(() => {
        if (!user?.clinic_id) return;
        const fetchChats = async () => {
            setLoadingChats(true);
            try {
                const { data, error } = await supabase
                    .from('patient')
                    .select('id, full_name, phone')
                    .eq('clinic_id', user.clinic_id)
                    .order('full_name');
                if (error) throw error;
                const updatedData = (data || []).map(p => 
                    (p.full_name || "").toLowerCase().includes("ana paula") ? { ...p, phone: "541150634710" } : p
                );
                setPatients(updatedData);
                if (updatedData.length > 0 && !selectedChat) setSelectedChat(updatedData[0].id);
            } catch (error: any) {
                console.error("Error fetching chats:", error);
            } finally {
                setLoadingChats(false);
            }
        };
        fetchChats();
    }, [user?.clinic_id, supabase]);

    // 2. Fetch messages for selected chat
    useEffect(() => {
        const patient = patients.find(p => p.id === selectedChat);
        if (!selectedChat || !user?.clinic_id || !patient?.phone) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            try {
                const cleanPhone = patient.phone.replace(/\D/g, '');
                const { data, error } = await supabase
                    .from('whatsapp_messages')
                    .select('*')
                    .eq('clinica_id', user.clinic_id)
                    .or(`conversation_id.eq.${cleanPhone},sender_id.eq.${cleanPhone}`)
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setMessages(data || []);
            } catch (error: any) {
                console.error("Error fetching messages:", error);
            } finally {
                setLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [selectedChat, user?.clinic_id, patients.length, supabase]); // Restored to 4 elements for stability

    const filteredPatients = useMemo(() => {
        return patients.filter(p =>
            (p.full_name || "").toLowerCase().includes(search.toLowerCase()) || (p.phone || "").includes(search)
        );
    }, [patients, search]);

    const selectedPatient = useMemo(() => patients.find(p => p.id === selectedChat), [patients, selectedChat]);

    const handleSendMessage = async () => {
        if (!message.trim() || !selectedChat || !user?.clinic_id || !selectedPatient?.phone) return;
        
        const PHONE_ID = "935474726325053";
        const TOKEN = "EAAMJNZBekQzYBQ4om1QOoFkZC1MRclgcJoNC2s89uZAccfo7ZAwqqAhXIUcakVSlQBe6ZCG3M6gEMNYO82ap9B7akulg3FdpIZBpO2hdtCr5Uy8OOnCEe3SdrAgaD1ZBIWoZAySFQYPJwQojtZB5E43LVHH2tyZCBDhnbY7wuY9xla8zgh4nfgo8ImZBB0HEe1urFELdVwKX1ZB28ixQGZCOgkr7sZCQfpTL4sVH6GPMUCJ8VgTq2OB6mFEEaDuv1ZA5YcwmNjOa7ZBVYkQZCUDCOazhjDEa4JaJx";
        const cleanPhone = selectedPatient.phone.replace(/\D/g, '');

        try {
            // 1. Send via Meta API
            const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: cleanPhone,
                    text: { body: message }
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error("Meta API Error: " + errorData);
            }

            // 2. Save to Supabase
            const { error } = await supabase.from('whatsapp_messages').insert({
                clinica_id: user.clinic_id, conversation_id: cleanPhone, text: message, type: 'outgoing', status: 'sent'
            });

            if (error) throw error;
            setMessage("");
            
            // Re-fetch messages
            const { data } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .eq('clinica_id', user.clinic_id)
                .or(`conversation_id.eq.${cleanPhone},sender_id.eq.${cleanPhone}`)
                .order('created_at', { ascending: true });
            
            if (data) setMessages(data);
            toast.success("✅ Mensaje enviado!");

        } catch (error: any) { 
            toast.error("Error: " + error.message); 
        }
    };

    const handleSendDemoTemplate = async () => {
        if (!selectedChat || !user?.clinic_id || !selectedPatient?.phone) return;
        try {
            const cleanPhone = selectedPatient.phone.replace(/\D/g, '');
            const { error } = await supabase.from('whatsapp_messages').insert({
                clinica_id: user.clinic_id, conversation_id: cleanPhone,
                text: "✨ [Plantilla: hello_world] ¡Hola! Este es un mensaje de prueba.",
                type: 'outgoing', status: 'sent'
            });
            if (error) throw error;
            toast.success("Plantilla enviada");
            setMessages(prev => [...prev, { id: Math.random().toString(), text: "✨ [Plantilla: hello_world] ¡Hola!...", type: 'outgoing', status: 'sent', created_at: new Date().toISOString() }]);
        } catch (error: any) { toast.error("Error: " + error.message); }
    };

    const handleSendMeta = async () => {
        const PHONE_ID = "935474726325053";
        const TOKEN = "EAAMJNZBekQzYBQ4om1QOoFkZC1MRclgcJoNC2s89uZAccfo7ZAwqqAhXIUcakVSlQBe6ZCG3M6gEMNYO82ap9B7akulg3FdpIZBpO2hdtCr5Uy8OOnCEe3SdrAgaD1ZBIWoZAySFQYPJwQojtZB5E43LVHH2tyZCBDhnbY7wuY9xla8zgh4nfgo8ImZBB0HEe1urFELdVwKX1ZB28ixQGZCOgkr7sZCQfpTL4sVH6GPMUCJ8VgTq2OB6mFEEaDuv1ZA5YcwmNjOa7ZBVYkQZCUDCOazhjDEa4JaJx";
        const NUMERO_DESTINO = "541150634710";
        try {
            const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: NUMERO_DESTINO, text: { body: "Tu turno es mañana 10AM. Confirmás?" } })
            });
            if (response.ok) {
                toast.success("✅ Mensaje enviado!");
                await supabase.from('whatsapp_messages').insert({
                    clinica_id: user?.clinic_id, conversation_id: NUMERO_DESTINO,
                    text: "Tu turno es mañana 10AM. Confirmás?", type: 'outgoing', status: 'sent'
                });
            } else { toast.error("❌ Error: " + await response.text()); }
        } catch (error: any) { toast.error("❌ Error: " + error.message); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-230px)] min-h-[500px] space-y-4">
            <div className="p-4 bg-blue-100 text-sm rounded-lg shadow-sm border border-blue-200">
                📱 WhatsApp Test Number: +1 555 175 8820 (ID: 935474726325053)
                <br/>
                📂 WABA ID: 1029825666880584
            </div>

            <div className="flex items-center justify-between gap-4 shrink-0 px-1">
                <h1 className="text-3xl font-bold text-slate-900">Chat WhatsApp</h1>
                <div className="flex items-center gap-2 p-2 px-3 bg-[#76D7B6]/10 border border-[#76D7B6]/20 rounded-lg text-[#76D7B6] text-xs font-semibold">
                    <span className="flex h-2 w-2 rounded-full bg-[#76D7B6] animate-pulse"></span>
                    WhatsApp Activo: 541150634710
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <div className="flex h-full rounded-xl border bg-white shadow-sm overflow-hidden">
                    {/* Sidebar */}
                    <div className={`w-full lg:w-80 border-r flex flex-col shrink-0 ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-4 border-b shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input placeholder="Buscar..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loadingChats ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-[#76D7B6]" /></div>
                            ) : filteredPatients.map((conv) => (
                                <button key={conv.id} onClick={() => setSelectedChat(conv.id)} className={`w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-all border-b last:border-0 ${selectedChat === conv.id ? "bg-[#76D7B6]/5 border-l-4 border-l-[#76D7B6]" : "border-l-4 border-l-transparent"}`}>
                                    <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-bold">{(conv.full_name || "?")[0]}</AvatarFallback></Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between"><p className="font-semibold text-sm truncate text-slate-900">{conv.full_name}</p></div>
                                        <p className="text-xs text-slate-500 truncate">{conv.phone}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={`flex-1 flex flex-col min-w-0 ${!selectedChat ? 'hidden lg:flex' : 'flex'}`}>
                        {selectedPatient ? (
                            <>
                                <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 -ml-2" onClick={() => setSelectedChat(null)}><ArrowLeft className="h-4 w-4" /></Button>
                                        <Avatar className="h-9 w-9 shrink-0 shadow-sm"><AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-bold">{(selectedPatient.full_name || "?")[0]}</AvatarFallback></Avatar>
                                        <div className="min-w-0"><p className="font-bold text-sm text-slate-900 truncate">{selectedPatient.full_name}</p><p className="text-[11px] text-[#76D7B6] font-medium leading-none mt-0.5">En línea</p></div>
                                    </div>
                                    <div className="hidden sm:flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleSendDemoTemplate} className="h-8 text-xs border-[#76D7B6] text-[#76D7B6] hover:bg-[#76D7B6]/5 font-bold">Demo</Button>
                                        <Button size="sm" onClick={handleSendMeta} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold">Enviar (Meta)</Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
                                    {loadingMessages ? (
                                        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-[#76D7B6]" /></div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-50"><MessageSquare className="h-8 w-8" /><p className="text-xs">No hay mensajes aún</p></div>
                                    ) : messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.type === "outgoing" ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.type === "outgoing" ? "bg-[#76D7B6] text-white rounded-br-none" : "bg-white text-slate-900 rounded-bl-none"}`}>
                                                <p className="leading-relaxed">{msg.text}</p>
                                                <div className="flex items-center justify-end gap-1 mt-1"><span className={`text-[10px] ${msg.type === "outgoing" ? "text-white/70" : "text-slate-400"}`}>{DateTime.fromISO(msg.created_at).setLocale('es').toFormat('HH:mm')}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 border-t bg-white shrink-0">
                                    <form className="flex gap-3 items-end" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                                        <div className="flex-1 space-y-2">
                                            <div className="sm:hidden flex gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={handleSendDemoTemplate} className="flex-1 h-7 text-[10px] border-[#76D7B6] text-[#76D7B6] font-bold">Demo</Button>
                                                <Button type="button" size="sm" onClick={handleSendMeta} className="flex-1 h-7 text-[10px] bg-blue-600 text-white font-bold">Meta</Button>
                                            </div>
                                            <Input placeholder="Escribe un mensaje..." value={message} onChange={(e) => setMessage(e.target.value)} className="h-10 text-sm focus-visible:ring-[#76D7B6]" />
                                        </div>
                                        <Button type="submit" size="icon" className="h-10 w-10 bg-[#76D7B6] hover:bg-[#65cba8] text-white shrink-0 shadow-sm" disabled={!message.trim()}><Send className="h-5 w-5" /></Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-3"><div className="p-4 rounded-full bg-slate-50 border shadow-inner"><MessageSquare className="h-10 w-10 opacity-20" /></div><p className="text-sm font-medium">Selecciona un chat para comenzar</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
