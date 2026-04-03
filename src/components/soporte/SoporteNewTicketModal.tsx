"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, LifeBuoy, Paperclip } from "lucide-react";
import { createTicket } from "@/app/actions/soporte";

// ─── Schema ──────────────────────────────────────────────────────────────────

const ticketSchema = z.object({
    subject: z
        .string()
        .min(3, "El asunto debe tener al menos 3 caracteres")
        .max(200),
    category: z.enum([
        "agenda",
        "whatsapp",
        "pagos",
        "calendar",
        "cuenta",
        "otro",
    ]),
    body: z
        .string()
        .min(10, "El mensaje debe tener al menos 10 caracteres")
        .max(5000),
});

type TicketValues = z.infer<typeof ticketSchema>;

const CATEGORY_OPTIONS: { value: TicketValues["category"]; label: string }[] = [
    { value: "agenda", label: "Agenda" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "pagos", label: "Pagos" },
    { value: "calendar", label: "Google Calendar" },
    { value: "cuenta", label: "Mi cuenta" },
    { value: "otro", label: "Otro" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Props ────────────────────────────────────────────────────────────────────

interface SoporteNewTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceModule?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SoporteNewTicketModal({
    isOpen,
    onClose,
    sourceModule,
}: SoporteNewTicketModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isValid },
    } = useForm<TicketValues>({
        mode: "onChange",
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            subject: "",
            category: undefined,
            body: "",
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && file.size > MAX_FILE_SIZE) {
            toast.error("La imagen no puede superar los 5 MB");
            e.target.value = "";
            return;
        }
        setAttachmentFile(file);
    };

    const handleClose = () => {
        reset();
        setIsUrgent(false);
        setAttachmentFile(null);
        onClose();
    };

    const onSubmit = async (values: TicketValues) => {
        setIsSaving(true);

        try {
            let attachmentUrl: string | undefined;

            // ── Upload de adjunto a Supabase Storage ──────────────────────
            if (attachmentFile) {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();

                const ext = attachmentFile.name.split(".").pop() ?? "png";
                const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from("support-attachments")
                    .upload(path, attachmentFile, { upsert: false });

                if (uploadError) {
                    throw new Error("Error al subir la imagen: " + uploadError.message);
                }

                const { data: publicUrlData } = supabase.storage
                    .from("support-attachments")
                    .getPublicUrl(path);

                attachmentUrl = publicUrlData.publicUrl;
            }

            // ── Llamada al Server Action ───────────────────────────────────
            const result = await createTicket({
                subject: values.subject,
                category: values.category,
                priority: isUrgent ? "urgente" : "normal",
                body: values.body,
                source_module: sourceModule,
                attachment_url: attachmentUrl,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            toast.success("Ticket enviado. Te responderemos a la brevedad.");
            handleClose();
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Error al enviar el ticket";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LifeBuoy className="h-5 w-5 text-[#2DD4A8]" />
                        Nuevo ticket de soporte
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
                    {/* Asunto */}
                    <div className="space-y-2">
                        <Label htmlFor="subject">
                            Asunto <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="subject"
                            placeholder="Ej: No puedo crear un turno para mañana"
                            {...register("subject")}
                        />
                        {errors.subject && (
                            <p className="text-xs text-red-500">{errors.subject.message}</p>
                        )}
                    </div>

                    {/* Categoría */}
                    <div className="space-y-2">
                        <Label>
                            Categoría <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={watch("category")}
                            onValueChange={(v) =>
                                setValue("category", v as TicketValues["category"], {
                                    shouldValidate: true,
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccioná una categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category && (
                            <p className="text-xs text-red-500">{errors.category.message}</p>
                        )}
                    </div>

                    {/* Prioridad */}
                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div className="space-y-0.5">
                            <Label htmlFor="urgente" className="text-sm font-medium">
                                Marcar como urgente
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Solo para problemas que impiden operar la clínica
                            </p>
                        </div>
                        <Switch
                            id="urgente"
                            checked={isUrgent}
                            onCheckedChange={setIsUrgent}
                        />
                    </div>

                    {/* Mensaje */}
                    <div className="space-y-2">
                        <Label htmlFor="body">
                            Mensaje <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="body"
                            rows={5}
                            placeholder="Describí el problema con el mayor detalle posible: qué intentabas hacer, qué pasó, en qué pantalla ocurrió..."
                            {...register("body")}
                        />
                        {errors.body && (
                            <p className="text-xs text-red-500">{errors.body.message}</p>
                        )}
                    </div>

                    {/* Captura de pantalla */}
                    <div className="space-y-2">
                        <Label htmlFor="attachment" className="flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5" />
                            Captura de pantalla{" "}
                            <span className="text-muted-foreground font-normal">(opcional)</span>
                        </Label>
                        <Input
                            id="attachment"
                            type="file"
                            accept="image/*"
                            className="cursor-pointer file:cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
                            onChange={handleFileChange}
                        />
                        {attachmentFile && (
                            <p className="text-xs text-muted-foreground">
                                {attachmentFile.name} &mdash;{" "}
                                {(attachmentFile.size / 1024).toFixed(0)} KB
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">Máximo 5 MB. PNG, JPG o WebP.</p>
                    </div>

                    <DialogFooter className="border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving || !isValid}
                            className="bg-[#2DD4A8] hover:bg-[#2DD4A8]/90 text-slate-900 dark:text-slate-900 min-w-[140px]"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                "Enviar ticket"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
