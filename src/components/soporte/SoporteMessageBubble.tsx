"use client";

import { Paperclip } from "lucide-react";

interface SoporteMessageBubbleProps {
  message: {
    id: string;
    sender_type: string;
    body: string;
    attachment_url?: string | null;
    created_at: string;
    professional?: { full_name: string } | null;
  };
}

export function SoporteMessageBubble({ message }: SoporteMessageBubbleProps) {
  const isUser = message.sender_type === "user";

  const formattedTime = new Date(message.created_at).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[75%] flex-col gap-1">
        {/* Label del remitente */}
        {isUser && message.professional?.full_name ? (
          <span className="text-right text-xs text-muted-foreground">
            {message.professional.full_name}
          </span>
        ) : !isUser ? (
          <span className="text-xs font-medium text-[#82D9BC]">
            Equipo Livio
          </span>
        ) : null}

        {/* Burbuja */}
        <div
          className={[
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-br-md bg-[#82D9BC] text-[#1F2429]"
              : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap">{message.body}</p>

          {message.attachment_url && (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                "mt-2 flex items-center gap-1 text-xs underline underline-offset-2",
                isUser
                  ? "text-[#1F2429]/70 hover:text-[#1F2429]"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
            >
              <Paperclip className="h-3 w-3" />
              Ver adjunto
            </a>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={`text-xs text-muted-foreground ${isUser ? "text-right" : "text-left"}`}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
