"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Algo salió mal</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                    Ocurrió un error inesperado. Podés intentar de nuevo o volver al dashboard.
                </p>
            </div>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
                    Ir al Dashboard
                </Button>
                <Button onClick={reset}>
                    Intentar de nuevo
                </Button>
            </div>
        </div>
    );
}
