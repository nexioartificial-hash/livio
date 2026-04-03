"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";

interface SoporteTicketCardProps {
  ticket: {
    id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    professional?: { full_name: string } | null;
  };
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  abierto: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  en_progreso:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  resuelto:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cerrado:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  abierto: "Abierto",
  en_progreso: "En progreso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const CATEGORY_LABELS: Record<string, string> = {
  facturacion: "Facturación",
  tecnico: "Técnico",
  cuenta: "Cuenta",
  integracion: "Integración",
  otro: "Otro",
};

export function SoporteTicketCard({ ticket, onClick }: SoporteTicketCardProps) {
  const formattedDate = new Date(ticket.created_at).toLocaleDateString(
    "es-AR",
    { day: "numeric", month: "short" }
  );

  const statusColor =
    STATUS_COLORS[ticket.status] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status;
  const categoryLabel =
    CATEGORY_LABELS[ticket.category] ?? ticket.category;

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-shadow hover:shadow-md hover:border-[#82D9BC]/60"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Columna principal */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {ticket.priority === "urgente" && (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
              )}
              <p className="truncate text-sm font-medium leading-snug">
                {ticket.subject}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{categoryLabel}</span>
              {ticket.professional?.full_name && (
                <>
                  <span>·</span>
                  <span>{ticket.professional.full_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Columna derecha: badge + fecha */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge className={`border-0 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
