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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { treatmentSchema, TreatmentValues } from "@/lib/validators/config";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Stethoscope, Trash2, Clock, DollarSign } from "lucide-react";
import { sentenceCase } from "@/utils/masks";
import { formatCurrency, parseCurrency } from "@/utils/formatters";

interface TreatmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem: any | null;
    clinicId: string;
    onSuccess: (data: any, isEdit: boolean) => void;
}

const CATEGORIES = [
    "Preventivo",
    "Restaurador",
    "Endodoncia",
    "Cirugía",
    "Implantes",
    "Prótesis",
    "Ortodoncia",
    "Estética",
    "Diagnóstico",
    "Otros"
];

const PRESET_COLORS = [
    "#76D7B6", "#A3E4D7", "#F7DC6F", "#F8C471", "#E74C3C", 
    "#AF7AC5", "#C39BD3", "#5DADE2", "#AED6F1", "#2C3E50",
    "#566573", "#D5DBDB", "#EB984E", "#EC7063", "#D4EFDF"
];

export default function TreatmentModal({
    isOpen,
    onClose,
    editingItem,
    clinicId,
    onSuccess,
}: TreatmentModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isValid },
    } = useForm<TreatmentValues>({
        mode: "onChange",
        resolver: zodResolver(treatmentSchema) as any,
        defaultValues: {
            nombre: "",
            categoria: "Otros",
            precio: "0",
            duracion: "30",
            noms: "",
            color: "#76D7B6",
            activo: true,
            descripcion: "",
        },
    });

    const watchedName = watch("nombre");
    const watchedDuration = watch("duracion");
    const watchedPrice = watch("precio");
    const watchedColor = watch("color");

    useEffect(() => {
        if (editingItem) {
            reset({
                nombre: editingItem.nombre,
                categoria: editingItem.categoria || "Otros",
                precio: String(editingItem.precio || 0),
                duracion: String(editingItem.duracion || 30),
                noms: editingItem.noms || "",
                color: editingItem.color || "#76D7B6",
                activo: editingItem.activo ?? true,
                descripcion: editingItem.descripcion || "",
            });
        } else {
            reset({
                nombre: "",
                categoria: "Otros",
                precio: "0",
                duracion: "30",
                noms: "",
                color: "#76D7B6",
                activo: true,
                descripcion: "",
            });
        }
    }, [editingItem, reset]);

    const onSubmit = async (values: TreatmentValues) => {
        if (!clinicId) return;
        setIsSaving(true);

        try {
            const payload = {
                ...values,
                clinic_id: clinicId,
            };

            if (editingItem) {
                const { data, error } = await supabase
                    .from("tratamiento")
                    .update(payload)
                    .eq("id", editingItem.id)
                    .select("*")
                    .single();

                if (error) throw error;
                toast.success("Tratamiento actualizado correctamente");
                onSuccess(data, true);
            } else {
                const { data, error } = await supabase
                    .from("tratamiento")
                    .insert(payload)
                    .select("*")
                    .single();

                if (error) throw error;
                toast.success("Tratamiento agregado al catálogo");
                onSuccess(data, false);
            }
            onClose();
        } catch (error: any) {
            console.error("Error saving treatment:", error);
            toast.error("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!confirm("¿Estás seguro de eliminar este tratamiento?")) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from("tratamiento")
                .delete()
                .eq("id", editingItem.id);

            if (error) throw error;
            toast.success("Tratamiento eliminado");
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
            <DialogContent className="max-w-md p-0 sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col border-none shadow-2xl">
                <DialogHeader className="p-4 border-b bg-white flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-slate-800">
                        <Stethoscope className="h-5 w-5 text-[#76D7B6]" />
                        {editingItem ? "Editar Tratamiento" : "Nuevo Tratamiento"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                    <div className="grid gap-4">
                        {/* Compact 2x2 Grid for core fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Nombre</Label>
                                <Input 
                                    {...register("nombre")} 
                                    placeholder="Nombre"
                                    className="h-9 text-sm"
                                    onChange={(e) => {
                                        const val = sentenceCase(e.target.value);
                                        setValue("nombre", val);
                                    }}
                                />
                                {errors.nombre && <p className="text-[10px] text-red-500">{errors.nombre.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Categoría</Label>
                                <Select 
                                    value={watch("categoria")} 
                                    onValueChange={(v) => setValue("categoria", v)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                             <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Código NOMS</Label>
                                <Input 
                                    {...register("noms")} 
                                    placeholder="Código"
                                    className="h-9 text-sm"
                                />
                                {errors.noms && <p className="text-[10px] text-red-500">{errors.noms.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Duración (min)</Label>
                                <div className="relative">
                                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input 
                                        type="number" 
                                        className="h-9 pl-8 text-sm"
                                        {...register("duracion", { valueAsNumber: true })} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 my-1" />

                        {/* Color and Preview Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-600">Color Identificador</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRESET_COLORS.slice(0, 8).map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-6 h-6 rounded-full border transition-all ${watchedColor === color ? "ring-2 ring-slate-400 ring-offset-1 scale-110" : "border-transparent hover:scale-110"}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setValue("color", color)}
                                        />
                                    ))}
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                                        <input 
                                            type="color" 
                                            className="absolute inset-0 w-[200%] h-[200%] -translate-x-[25%] -translate-y-[25%] cursor-pointer"
                                            value={watchedColor}
                                            onChange={(e) => setValue("color", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: watchedColor }} />
                                    <span className="text-[11px] font-bold text-slate-700 truncate">{watchedDuration}min | ${Number(watchedPrice).toLocaleString()}</span>
                                </div>
                                <Badge className="text-[9px] h-4 px-1 bg-slate-200 text-slate-600 border-none">
                                    {watch("noms") || "NOMS"}
                                </Badge>
                            </div>
                        </div>

                        {/* Price and Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Precio Base ($)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input 
                                        className="h-9 pl-8 text-sm"
                                        placeholder="0"
                                        value={formatCurrency(watchedPrice)}
                                        onChange={(e) => {
                                            const numValue = parseCurrency(e.target.value);
                                            setValue("precio", String(numValue), { shouldValidate: true });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-3 h-9 bg-slate-50 rounded-md border border-slate-100 self-end">
                                <Label className="text-xs font-medium text-slate-600">Activo</Label>
                                <Switch 
                                    className="scale-75"
                                    checked={watch("activo")}
                                    onCheckedChange={(checked) => setValue("activo", checked)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Notas / Descripción</Label>
                            <textarea 
                                {...register("descripcion")} 
                                placeholder="Notas internas para recepcionista..."
                                className="w-full h-16 p-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                rows={2}
                                onChange={(e) => {
                                    const val = sentenceCase(e.target.value);
                                    setValue("descripcion", val);
                                }}
                            />
                        </div>
                    </div>
                </form>

                <DialogFooter className="p-4 border-t bg-slate-50/50 flex-shrink-0 gap-2">
                    {editingItem && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 mr-auto"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Eliminar
                        </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8">
                        Cancelar
                    </Button>
                    <Button 
                        type="submit" 
                        size="sm"
                        disabled={isSaving || !isValid}
                        onClick={handleSubmit(onSubmit as any)}
                        className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 h-8 px-4"
                    >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (editingItem ? "Actualizar" : "Crear")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
