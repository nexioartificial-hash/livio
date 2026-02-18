"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Search } from "lucide-react";

const mockConversations = [
    { id: 1, name: "María López", lastMsg: "Hola, quería consultar por una limpieza", time: "10:30", unread: 2 },
    { id: 2, name: "Carlos Ruiz", lastMsg: "Perfecto, nos vemos el martes", time: "09:15", unread: 0 },
    { id: 3, name: "Ana García", lastMsg: "¿Tienen turno disponible esta semana?", time: "Ayer", unread: 1 },
    { id: 4, name: "Pedro Martínez", lastMsg: "Gracias por la info!", time: "Ayer", unread: 0 },
];

const mockMessages = [
    { id: 1, from: "patient", text: "Hola, quería consultar por una limpieza dental", time: "10:28" },
    { id: 2, from: "patient", text: "¿Tienen turno disponible esta semana?", time: "10:29" },
    { id: 3, from: "clinic", text: "¡Hola María! Sí, tenemos disponibilidad el jueves a las 15hs. ¿Te queda bien?", time: "10:30" },
    { id: 4, from: "patient", text: "Perfecto! Reservo ese turno", time: "10:32" },
];

export default function ChatPage() {
    const [selectedChat, setSelectedChat] = useState(1);
    const [message, setMessage] = useState("");

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Chat WhatsApp</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-xl border bg-white shadow-sm overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
                {/* Conversations List */}
                <div className="border-r flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Buscar conversación..." className="pl-10" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {mockConversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedChat(conv.id)}
                                className={`w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors border-b ${selectedChat === conv.id ? "bg-[#76D7B6]/5" : ""}`}
                            >
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] text-sm font-bold">
                                        {conv.name.split(" ").map(n => n[0]).join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm text-slate-900 truncate">{conv.name}</p>
                                        <span className="text-xs text-slate-400">{conv.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{conv.lastMsg}</p>
                                </div>
                                {conv.unread > 0 && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#76D7B6] text-[10px] font-bold text-white">
                                        {conv.unread}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="lg:col-span-2 flex flex-col">
                    <div className="p-4 border-b flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] text-xs font-bold">ML</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-sm">María López</p>
                            <p className="text-xs text-green-500">En línea</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {mockMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.from === "clinic" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${msg.from === "clinic"
                                        ? "bg-[#76D7B6] text-white rounded-br-md"
                                        : "bg-white text-slate-900 shadow-sm rounded-bl-md"
                                    }`}>
                                    <p>{msg.text}</p>
                                    <p className={`text-[10px] mt-1 ${msg.from === "clinic" ? "text-white/70" : "text-slate-400"}`}>{msg.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t bg-white">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Escribir mensaje..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="flex-1"
                            />
                            <Button size="icon" className="bg-[#76D7B6] hover:bg-[#65cba8]">
                                <Send className="h-4 w-4 text-white" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
