"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SoporteMessageBubble } from "@/components/soporte/SoporteMessageBubble";
import { sendMessage, updateTicketStatus } from "@/app/actions/soporte";

interface SoporteChatProps {
  ticket: any;
  initialMessages: any[];
}

const STATUS_LABELS: Record<string, string> = {
  abierto: "Abierto",
  en_progreso: "En progreso",
  esperando_respuesta: "Esperando respuesta",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const STATUS_COLORS: Record<string, string> = {
  abierto: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  en_progreso:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  esperando_respuesta:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  resuelto:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cerrado:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  agenda: "Agenda",
  whatsapp: "WhatsApp",
  pagos: "Pagos",
  calendar: "Google Calendar",
  cuenta: "Mi cuenta",
  otro: "Otro",
};

const CLOSED_STATUSES = ["cerrado", "resuelto"];

export function SoporteChat({ ticket, initialMessages }: SoporteChatProps) {
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isClosed = CLOSED_STATUSES.includes(ticket.status);

  // Auto-scroll al ultimo mensaje cuando cambia el array
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const body = inputValue.trim();
    if (!body || isSending) return;

    // Actualización optimista: agregar mensaje localmente antes de la respuesta del server
    const optimisticMessage = {
      id: crypto.randomUUID(),
      ticket_id: ticket.id,
      sender_type: "user",
      sender_id: null,
      body,
      attachment_url: null,
      created_at: new Date().toISOString(),
      professional: null,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const result = await sendMessage({ ticket_id: ticket.id, body });
      if (result.error) {
        // Revertir el mensaje optimista si el server devuelve error
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        );
        setInputValue(body);
        toast.error(result.error);
      }
    } catch {
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMessage.id)
      );
      setInputValue(body);
      toast.error("Error al enviar el mensaje");
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleCloseTicket() {
    setIsClosing(true);
    try {
      const result = await updateTicketStatus(ticket.id, "cerrado");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket cerrado");
        router.push("/soporte");
      }
    } catch {
      toast.error("Error al cerrar el ticket");
    } finally {
      setIsClosing(false);
    }
  }

  const statusColor =
    STATUS_COLORS[ticket.status] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status;
  const categoryLabel = CATEGORY_LABELS[ticket.category] ?? ticket.category;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/soporte")}
          aria-label="Volver a soporte"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug">
            {ticket.subject}
          </p>
          <p className="text-xs text-muted-foreground">{categoryLabel}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge className={`border-0 text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </Badge>

          {ticket.priority === "urgente" && (
            <Badge className="border-0 bg-red-100 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Urgente
            </Badge>
          )}

          {!isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseTicket}
              disabled={isClosing}
              className="ml-1 text-xs"
            >
              {isClosing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Cerrar ticket
            </Button>
          )}
        </div>
      </div>

      {/* Area de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((message) => (
            <SoporteMessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input o mensaje de ticket cerrado */}
      {isClosed ? (
        <div className="border-t px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Este ticket está{" "}
            <span className="font-medium">{statusLabel.toLowerCase()}</span>.
            Para nuevas consultas, crea un ticket nuevo.
          </p>
        </div>
      ) : (
        <div className="border-t px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
              rows={2}
              className="flex-1 resize-none"
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={isSending || inputValue.trim().length === 0}
              size="icon"
              className="mb-0.5 shrink-0 bg-[#2DD4A8] hover:bg-[#2DD4A8]/90 text-slate-900 dark:text-slate-900"
              aria-label="Enviar mensaje"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
