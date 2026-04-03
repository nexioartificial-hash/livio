"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CreditCard, Loader2 } from "lucide-react";
import { DateTime } from "luxon";

interface PaymentRecord {
    id: string;
    event_type: string;
    mp_id: string | null;
    amount: number | null;
    currency: string;
    status: string;
    created_at: string;
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    authorized: { label: "Activa", variant: "default" },
    approved: { label: "Aprobado", variant: "default" },
    paused: { label: "Pausada", variant: "secondary" },
    cancelled: { label: "Cancelada", variant: "destructive" },
};

const eventLabels: Record<string, string> = {
    subscription_authorized: "Suscripción activada",
    subscription_paused: "Suscripción pausada",
    subscription_cancelled: "Suscripción cancelada",
    payment_approved: "Pago mensual",
};

export function PaymentHistoryTab({ clinicId }: { clinicId: string }) {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from("payment_history")
            .select("id, event_type, mp_id, amount, currency, status, created_at")
            .eq("clinic_id", clinicId)
            .order("created_at", { ascending: false })
            .limit(50)
            .then(({ data }) => {
                setPayments(data ?? []);
                setLoading(false);
            });
    }, [clinicId]);

    const formatAmount = (amount: number | null, currency: string) => {
        if (amount == null) return "—";
        return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Historial de Pagos
                </CardTitle>
            </CardHeader>
            <CardContent>
                {payments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                        No hay registros de pago todavía.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="text-sm">
                                        {DateTime.fromISO(p.created_at)
                                            .setZone("America/Argentina/Buenos_Aires")
                                            .toLocaleString(DateTime.DATETIME_SHORT, { locale: "es-AR" })}
                                    </TableCell>
                                    <TableCell>{eventLabels[p.event_type] ?? p.event_type}</TableCell>
                                    <TableCell className="font-medium">
                                        {formatAmount(p.amount, p.currency)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusBadge[p.status]?.variant ?? "outline"}>
                                            {statusBadge[p.status]?.label ?? p.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
