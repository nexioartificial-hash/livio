"use client";

import { useEffect, useState } from "react";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus, Loader2, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { saveObraSocial } from "@/app/actions/obras_sociales";
import { getTratamientos } from "@/app/actions/tratamientos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formSchema = z.object({
    nombre: z.string().min(2, "Mínimo 2 caracteres"),
    activo: z.boolean(),
});

const capitalize = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};

interface ObrasSocialModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    clinicId: string;
    obraSocial?: any;
}

export function ObrasSocialModal({
    open,
    onOpenChange,
    onSuccess,
    clinicId,
    obraSocial
}: ObrasSocialModalProps) {
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [openCombo, setOpenCombo] = useState(false);
    const [availableTratamientos, setAvailableTratamientos] = useState<any[]>([]);
    const [planesList, setPlanesList] = useState<{ nombre_plan: string; cobertura_pct: number }[]>([
        { nombre_plan: "", cobertura_pct: 100 }
    ]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombre: "",
            activo: true,
        },
    });

    useEffect(() => {
        const fetchTrats = async () => {
            if (open && clinicId) {
                const res = await getTratamientos(clinicId);
                if (res.success && res.data) {
                    setAvailableTratamientos(res.data);
                }
            }
        };
        fetchTrats();
    }, [open, clinicId]);

    const defaultTreatments = ["Consulta", "Limpieza", "Obturación", "Endodoncia", "Extracción"];
    const options = Array.from(new Set([
        ...defaultTreatments,
        ...(availableTratamientos || []).map(t => t.nombre)
    ]));

    useEffect(() => {
        if (obraSocial) {
            form.reset({
                nombre: obraSocial.nombre,
                activo: obraSocial.activo,
            });
            setTags(obraSocial.tratamientos || []);
            
            try {
                const parsed = JSON.parse(obraSocial.plan);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPlanesList(parsed);
                } else {
                    setPlanesList([{ nombre_plan: obraSocial.plan || "", cobertura_pct: obraSocial.cobertura_pct || 100 }]);
                }
            } catch {
                setPlanesList([{ nombre_plan: obraSocial.plan || "", cobertura_pct: obraSocial.cobertura_pct || 100 }]);
            }
        } else {
            form.reset({
                nombre: "",
                activo: true,
            });
            setTags([]);
            setPlanesList([{ nombre_plan: "", cobertura_pct: 100 }]);
        }
    }, [obraSocial, form, open]);

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const validPlanes = planesList.filter(p => p.nombre_plan.trim() !== "");
        if (validPlanes.length === 0) {
            toast.error("Debe agregar al menos un plan");
            return;
        }

        setLoading(true);
        const res = await saveObraSocial({
            id: obraSocial?.id,
            clinic_id: clinicId,
            ...values,
            plan: JSON.stringify(validPlanes),
            cobertura_pct: validPlanes[0].cobertura_pct,
            tratamientos: tags,
        });

        if (res.success) {
            toast.success(obraSocial ? "Obra Social actualizada" : "Obra Social creada");
            onSuccess();
            onOpenChange(false);
        } else {
            toast.error(res.error || "Error al guardar");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[85vh] flex flex-col">
                <DialogHeader className="px-8 pt-8 pb-4 bg-white shrink-0">
                    <DialogTitle className="text-2xl font-bold text-slate-900">
                        {obraSocial ? "Editar Obra Social" : "Nueva Obra Social"}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden flex-1 bg-white">
                        <div className="flex-1 overflow-y-auto px-8 space-y-6 pb-6">
                            <div className="grid grid-cols-1 gap-4">
                            <FormField
                                control={form.control}
                                name="nombre"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre de la Entidad</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Ej: OSDE, Swiss Medical" 
                                                {...field} 
                                                onChange={(e) => field.onChange(capitalize(e.target.value))}
                                                className="h-11 rounded-xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-[#10B981]" 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planes y Cobertura</FormLabel>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-xs text-[#10B981] hover:text-[#0b9c6d] font-bold px-2"
                                    onClick={() => setPlanesList([...planesList, { nombre_plan: "", cobertura_pct: 100 }])}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Añadir Plan
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {planesList.map((planObj, index) => (
                                    <div key={index} className="flex gap-3 items-start bg-slate-50/50 p-3 rounded-xl border border-slate-100 relative group">
                                        <div className="flex-1 space-y-3 relative">
                                            <div>
                                                <Input 
                                                    placeholder="Nombre del plan (ej: 210, Básico)" 
                                                    value={planObj.nombre_plan}
                                                    onChange={(e) => {
                                                        const nw = [...planesList];
                                                        nw[index].nombre_plan = capitalize(e.target.value);
                                                        setPlanesList(nw);
                                                    }}
                                                    className="h-10 rounded-xl bg-white border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-[#10B981]"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Cobertura</span>
                                                <Slider
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    value={[planObj.cobertura_pct]}
                                                    onValueChange={(vals) => {
                                                        const nw = [...planesList];
                                                        nw[index].cobertura_pct = vals[0];
                                                        setPlanesList(nw);
                                                    }}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full min-w-[45px] text-center">
                                                    {planObj.cobertura_pct}%
                                                </span>
                                            </div>
                                        </div>
                                        {planesList.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nw = planesList.filter((_, i) => i !== index);
                                                    setPlanesList(nw);
                                                }}
                                                className="h-6 w-6 mt-1 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm transition-all absolute -right-4 -top-4 bg-white border border-slate-100 shadow-sm opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tratamientos Cubiertos</FormLabel>
                            <Popover open={openCombo} onOpenChange={setOpenCombo}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCombo}
                                        className="w-full justify-between h-11 rounded-xl bg-slate-50 border-none font-normal text-slate-600 hover:bg-slate-100"
                                    >
                                        Seleccionar tratamientos...
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar tratamiento..." className="h-10" />
                                        <CommandList>
                                            <CommandEmpty>No se encontraron tratamientos.</CommandEmpty>
                                            <CommandGroup>
                                                {options.map((option) => (
                                                    <CommandItem
                                                        key={option}
                                                        value={option}
                                                        onSelect={() => {
                                                            if (tags.includes(option)) {
                                                                removeTag(option);
                                                            } else {
                                                                setTags([...tags, option]);
                                                            }
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                tags.includes(option) ? "opacity-100 text-[#76D7B6]" : "opacity-0"
                                                            )}
                                                        />
                                                        {option}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="bg-slate-50 text-slate-600 border-none py-1 pl-2.5 pr-1.5 flex items-center gap-1 group">
                                        <span className="text-[11px] font-medium">{tag}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => removeTag(tag)}
                                            className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                                {tags.length === 0 && (
                                    <p className="text-[10px] text-slate-400 italic">No hay tratamientos cargados</p>
                                )}
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="activo"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-bold text-slate-900">Estado Activo</FormLabel>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Habilitar esta OS para turnos</p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-[#10B981]"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        </div>

                        <DialogFooter className="px-8 pb-8 pt-4 border-t border-slate-50 sm:justify-between items-center shrink-0 bg-white">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="hidden sm:block text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="w-full sm:w-auto h-11 px-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm shadow-lg shadow-slate-200 gap-2">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {obraSocial ? "Guardar Cambios" : "Crear Obra Social"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
