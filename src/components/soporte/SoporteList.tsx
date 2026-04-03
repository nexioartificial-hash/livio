"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SoporteTicketCard } from "@/components/soporte/SoporteTicketCard";
import SoporteNewTicketModal from "@/components/soporte/SoporteNewTicketModal";
import { getTickets } from "@/app/actions/soporte";

interface SoporteListProps {
  initialTickets: any[];
}

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos los estados" },
  { value: "abierto", label: "Abierto" },
  { value: "en_progreso", label: "En progreso" },
  { value: "resuelto", label: "Resuelto" },
  { value: "cerrado", label: "Cerrado" },
];

const CATEGORY_OPTIONS = [
  { value: "todos", label: "Todas las categorías" },
  { value: "agenda", label: "Agenda" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "pagos", label: "Pagos" },
  { value: "calendar", label: "Google Calendar" },
  { value: "cuenta", label: "Mi cuenta" },
  { value: "otro", label: "Otro" },
];

export function SoporteList({ initialTickets }: SoporteListProps) {
  const router = useRouter();

  const [tickets, setTickets] = useState<any[]>(initialTickets);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No re-fetch en el primer render: ya tenemos initialTickets
    let cancelled = false;

    async function fetchTickets() {
      setLoading(true);
      const result = await getTickets({
        status: statusFilter !== "todos" ? statusFilter : undefined,
        category: categoryFilter !== "todos" ? categoryFilter : undefined,
      });
      if (!cancelled) {
        setTickets(result.tickets as any[] ?? []);
        setLoading(false);
      }
    }

    fetchTickets();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Soporte</h1>
        <Button
          onClick={() => setShowNewModal(true)}
          className="bg-[#2DD4A8] hover:bg-[#2DD4A8]/90 text-slate-900 dark:text-slate-900"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo ticket
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de tickets */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Cargando tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-base font-medium text-muted-foreground">
            No hay tickets
          </p>
          <p className="text-sm text-muted-foreground">
            Cuando crees un ticket de soporte, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <SoporteTicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => router.push(`/soporte/${ticket.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal nuevo ticket */}
      <SoporteNewTicketModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
      />
    </div>
  );
}
