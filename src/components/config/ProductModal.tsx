"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import { saveProducto } from "@/app/actions/inventario";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatCurrency, parseCurrency } from "@/utils/formatters";

const formSchema = z.object({
    producto: z.string().min(1, { message: "El producto es requerido" }),
    categoria: z.string().min(1, { message: "Selecciona una categoría" }),
    stock_actual: z.coerce.number().min(0, { message: "El stock no puede ser negativo" }),
    stock_min: z.coerce.number().min(0, { message: "El stock mínimo no puede ser negativo" }),
    precio_unit: z.coerce.number().min(0, { message: "El precio no puede ser negativo" }),
    ubicacion: z.string().optional(),
    vencimiento: z.date().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORIAS = [
    "Consumibles",
    "Restauración",
    "Anestesia",
    "Impresión",
    "Cementación",
    "Instrumental Rotatorio",
    "Prevención",
    "Operatoria",
    "Implantes",
    "Ortodoncia",
    "Prótesis",
    "Cirugía",
    "Endodoncia",
    "Otros"
];

const UBICACIONES = [
    "Box 1",
    "Box 2",
    "Box 3",
    "Consultorios",
    "Depósito",
    "Heladera Central",
    "Esterilizadora",
    "Vitrina Segura"
];

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem: any | null;
    clinicId: string;
    onSuccess: () => void;
}

export function ProductModal({ isOpen, onClose, editingItem, clinicId, onSuccess }: ProductModalProps) {
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            producto: "",
            categoria: "",
            stock_actual: 0,
            stock_min: 0,
            precio_unit: 0,
            ubicacion: "",
            vencimiento: null,
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                form.reset({
                    producto: editingItem.producto || "",
                    categoria: editingItem.categoria || "",
                    stock_actual: editingItem.stock_actual || 0,
                    stock_min: editingItem.stock_min || 0,
                    precio_unit: editingItem.precio_unit || 0,
                    ubicacion: editingItem.ubicacion || "",
                    vencimiento: editingItem.vencimiento ? new Date(editingItem.vencimiento) : null,
                });
            } else {
                form.reset({
                    producto: "",
                    categoria: "",
                    stock_actual: 0,
                    stock_min: 0,
                    precio_unit: 0,
                    ubicacion: "",
                    vencimiento: null,
                });
            }
        }
    }, [isOpen, editingItem, form]);

    const onSubmit = async (values: FormValues) => {
        setIsSaving(true);
        try {
            const dataToSave = {
                clinic_id: clinicId,
                ...values,
                vencimiento: values.vencimiento ? values.vencimiento.toISOString().split('T')[0] : null,
            };

            const result = await saveProducto(editingItem ? { id: editingItem.id, ...dataToSave } : dataToSave);
            
            if (result.success) {
                toast.success(editingItem ? "Producto actualizado correctamente" : "Producto añadido correctamente");
                onSuccess();
                onClose();
            } else {
                toast.error(result.error || "Error al guardar el producto");
            }
        } catch (error: any) {
            toast.error("Ocurrió un error inesperado al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
                <div className="bg-accent p-6 text-white shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            {editingItem ? "Editar Insumo" : "Nuevo Insumo"}
                        </DialogTitle>
                        <DialogDescription className="text-white/80">
                            Registra el stock de un componente para seguimiento.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 overflow-y-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            
                            <FormField
                                control={form.control}
                                name="producto"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Nombre del Insumo / Producto</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ej. Resina 3M Filtek..."
                                                className="border-slate-200 dark:border-slate-700 focus-visible:ring-accent"
                                                {...field}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    field.onChange(v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="categoria"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Categoría</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="border-slate-200 dark:border-slate-700 focus:ring-accent">
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {CATEGORIAS.map((c) => (
                                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="ubicacion"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Ubicación</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="border-slate-200 dark:border-slate-700 focus:ring-accent">
                                                        <SelectValue placeholder="Opcional..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {UBICACIONES.map((c) => (
                                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="stock_actual"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Stock Actual</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" className="border-slate-200 dark:border-slate-700 focus-visible:ring-accent" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="stock_min"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Stock Mínimo</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" className="border-slate-200 dark:border-slate-700 focus-visible:ring-accent" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="precio_unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Precio Unit. (ARS)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-slate-500 dark:text-slate-400">$</span>
                                                    <Input 
                                                        type="text" 
                                                        placeholder="0"
                                                        className="pl-6 border-slate-200 dark:border-slate-700 focus-visible:ring-accent" 
                                                        value={formatCurrency(field.value)}
                                                        onChange={(e) => field.onChange(parseCurrency(e.target.value))}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="vencimiento"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col pt-2">
                                        <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Fecha de Vencimiento</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP", { locale: es })
                                                        ) : (
                                                            <span>Elegir fecha (opcional)</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value || undefined}
                                                    onSelect={field.onChange}
                                                    disabled={(date: Date) => date < new Date(new Date().setHours(0,0,0,0))}
                                                    locale={es}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-6 shrink-0 mt-auto border-t">
                                <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSaving} className="bg-accent text-slate-900 dark:text-white hover:bg-accent/90">
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Insumo
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
