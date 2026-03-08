"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { stockSchema, StockValues } from "@/lib/validators/config";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Package, Trash2 } from "lucide-react";

interface StockModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem: any | null;
    clinicId: string;
    onSuccess: (data: any, isEdit: boolean) => void;
}

const CATEGORIES = [
    "Anestesia",
    "Resina",
    "Instrumental",
    "Descartables",
    "Ortodoncia",
    "Endodoncia",
    "Otros"
];

export default function StockModal({
    isOpen,
    onClose,
    editingItem,
    clinicId,
    onSuccess,
}: StockModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sucursales, setSucursales] = useState<any[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isValid },
    } = useForm<StockValues>({
        mode: "onChange",
        resolver: zodResolver(stockSchema) as any,
        defaultValues: {
            nombre: "",
            categoria: "Otros",
            stock_actual: 0,
            stock_minimo: 0,
            proveedor: "",
            caduca: "",
            lote: "",
            precio_compra: 0,
            precio_venta: 0,
            sucursal_id: "",
            notas: "",
            activo: true,
        },
    });

    useEffect(() => {
        if (clinicId) {
            fetchSucursales();
        }
    }, [clinicId]);

    const fetchSucursales = async () => {
        const { data } = await supabase
            .from("sucursal")
            .select("id, name")
            .eq("clinic_id", clinicId);
        if (data) setSucursales(data);
    };

    useEffect(() => {
        if (editingItem) {
            reset({
                nombre: editingItem.nombre,
                categoria: editingItem.categoria || "Otros",
                stock_actual: editingItem.stock_actual || 0,
                stock_minimo: editingItem.stock_minimo || 0,
                proveedor: editingItem.proveedor || "",
                caduca: editingItem.caduca || "",
                lote: editingItem.lote || "",
                precio_compra: Number(editingItem.precio_compra) || 0,
                precio_venta: Number(editingItem.precio_venta) || 0,
                sucursal_id: editingItem.sucursal_id || "",
                notas: editingItem.notas || "",
                activo: editingItem.activo ?? true,
            });
        } else {
            reset({
                nombre: "",
                categoria: "Otros",
                stock_actual: 0,
                stock_minimo: 0,
                proveedor: "",
                caduca: "",
                lote: "",
                precio_compra: 0,
                precio_venta: 0,
                sucursal_id: "",
                notas: "",
                activo: true,
            });
        }
    }, [editingItem, reset]);

    const onSubmit = async (values: StockValues) => {
        if (!clinicId) return;
        setIsSaving(true);

        try {
            const payload = {
                ...values,
                clinic_id: clinicId,
            };

            if (editingItem) {
                const { data, error } = await supabase
                    .from("stock")
                    .update(payload)
                    .eq("id", editingItem.id)
                    .select("*")
                    .single();

                if (error) throw error;
                toast.success("Producto actualizado correctamente");
                onSuccess(data, true);
            } else {
                const { data, error } = await supabase
                    .from("stock")
                    .insert(payload)
                    .select("*")
                    .single();

                if (error) throw error;
                toast.success("Producto agregado al inventario");
                onSuccess(data, false);
            }
            onClose();
        } catch (error: any) {
            console.error("Error saving stock:", error);
            toast.error("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!confirm("¿Estás seguro de eliminar este producto del inventario?")) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from("stock")
                .delete()
                .eq("id", editingItem.id);

            if (error) throw error;
            toast.success("Producto eliminado");
            onSuccess(editingItem.id, false);
            onClose();
        } catch (error: any) {
            toast.error("Error al eliminar: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-[#76D7B6]" />
                        {editingItem ? "Editar Producto" : "Nuevo Producto"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Básicos */}
                        <div className="space-y-2">
                            <Label>Nombre del Producto *</Label>
                            <Input 
                                {...register("nombre")} 
                                placeholder="Ej: Lidocaína 2%" 
                            />
                            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Categoría *</Label>
                            <Select 
                                value={watch("categoria")} 
                                onValueChange={(v) => setValue("categoria", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Stock */}
                        <div className="space-y-2">
                            <Label>Stock Actual *</Label>
                            <Input 
                                type="number" 
                                {...register("stock_actual", { valueAsNumber: true })} 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Stock Mínimo *</Label>
                            <Input 
                                type="number" 
                                {...register("stock_minimo", { valueAsNumber: true })} 
                            />
                        </div>

                        {/* Detalles */}
                        <div className="space-y-2">
                            <Label>Proveedor</Label>
                            <Input {...register("proveedor")} placeholder="Ej: Dentaltix" />
                        </div>

                        <div className="space-y-2">
                            <Label>Sucursal (Opcional)</Label>
                            <Select 
                                value={watch("sucursal_id") || "none"} 
                                onValueChange={(v) => setValue("sucursal_id", v === "none" ? "" : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas las sucursales" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">General / Todas</SelectItem>
                                    {sucursales.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Control */}
                        <div className="space-y-2">
                            <Label>Lote</Label>
                            <Input {...register("lote")} placeholder="Nº de Lote" />
                        </div>

                        <div className="space-y-2">
                            <Label>Fecha Caducidad</Label>
                            <Input type="date" {...register("caduca")} />
                        </div>

                        {/* Precios */}
                        <div className="space-y-2">
                            <Label>Precio Compra ($)</Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                {...register("precio_compra", { valueAsNumber: true })} 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Precio Venta ($)</Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                {...register("precio_venta", { valueAsNumber: true })} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notas / Aclaraciones</Label>
                        <Textarea 
                            {...register("notas")} 
                            placeholder="Especificaciones técnicas, ubicación en estante, etc." 
                        />
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between w-full border-t pt-4">
                        {editingItem && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-0 h-auto"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                Eliminar Producto
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isSaving || !isValid}
                                className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold min-w-[120px]"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    editingItem ? "Guardar cambios" : "Crear Producto"
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
