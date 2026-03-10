"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Save, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { saveTratamiento } from "@/app/actions/tratamientos";
import { formatCurrency, parseCurrency } from "@/utils/formatters";

const formSchema = z.object({
    id: z.string().optional(),
    categoria: z.string().min(1, "Selecciona una categoría"),
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    duracion_min: z.coerce.number().min(5, "Mínimo 5 minutos"),
    precio_promedio: z.coerce.number().min(0, "Mínimo 0"),
});

const CATEGORIAS = [
    "Consulta/Control",
    "Limpieza/Profilaxis",
    "Obturación/Caries",
    "Endodoncia",
    "Extracción",
    "Implantes",
    "Ortodoncia",
    "Blanqueamiento",
    "Periodoncia",
    "Prótesis"
];

interface TratamientoModalProps {
    clinicId: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    initialData?: any;
    onSuccess?: () => void;
}

export function TratamientoModal({ clinicId, open, setOpen, initialData, onSuccess }: TratamientoModalProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            categoria: "",
            nombre: "",
            duracion_min: 30,
            precio_promedio: 0,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                id: initialData.id,
                categoria: initialData.categoria,
                nombre: initialData.nombre,
                duracion_min: initialData.duracion_min,
                precio_promedio: initialData.precio_promedio,
            });
        } else {
            form.reset({
                categoria: "",
                nombre: "",
                duracion_min: 30,
                precio_promedio: 0,
            });
        }
    }, [initialData, form, open]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const result = await saveTratamiento({
            ...values,
            clinic_id: clinicId,
        });

        if (result.success) {
            toast.success(initialData ? "Tratamiento actualizado" : "Tratamiento creado");
            setOpen(false);
            onSuccess?.();
        } else {
            toast.error(result.error || "Error al guardar");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none bg-white shadow-2xl rounded-2xl">
                <div className="p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                             <div className="h-8 w-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                                <Stethoscope className="h-4 w-4 text-[#10B981]" />
                            </div>
                            {initialData ? "Editar Tratamiento" : "Nuevo Tratamiento"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-sm">
                            {(initialData 
                                ? "Modifica los detalles del tratamiento odontológico." 
                                : "Define un nuevo servicio para tu clínica.")}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="categoria"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Categoría
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                                                    <SelectValue placeholder="Selecciona una categoría" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CATEGORIAS.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nombre"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Nombre del Tratamiento
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Ej: Corona de Porcelana" 
                                                className="h-11 rounded-xl bg-slate-50 border-slate-200"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="duracion_min"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                Duración (min)
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number"
                                                    placeholder="30" 
                                                    className="h-11 rounded-xl bg-slate-50 border-slate-200"
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="precio_promedio"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                Precio Promedio ($)
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="text"
                                                    placeholder="15000" 
                                                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium"
                                                    value={formatCurrency(field.value)}
                                                    onChange={(e) => field.onChange(parseCurrency(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button 
                                type="submit" 
                                disabled={form.formState.isSubmitting}
                                className="w-full h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm gap-2 transition-all mt-4"
                            >
                                {form.formState.isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        {initialData ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                        {initialData ? "Guardar Cambios" : "Crear Tratamiento"}
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
