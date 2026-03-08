"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Stethoscope, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Treatment {
    id: string;
    nombre: string;
    categoria: string;
    duracion: number;
    color: string;
    precio: number;
}

interface TreatmentComboboxProps {
    clinicId: string;
    value?: string;
    onSelect: (treatment: Treatment | null) => void;
    placeholder?: string;
}

export function TreatmentCombobox({
    clinicId,
    value,
    onSelect,
    placeholder = "Seleccionar tratamiento...",
}: TreatmentComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [treatments, setTreatments] = React.useState<Treatment[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [search, setSearch] = React.useState("");

    React.useEffect(() => {
        if (clinicId) {
            fetchTreatments();
        }
    }, [clinicId]);

    const fetchTreatments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("tratamiento")
                .select("id, nombre, categoria, duracion, color, precio")
                .eq("clinic_id", clinicId)
                .eq("activo", true)
                .order("nombre");

            if (error) throw error;
            setTreatments(data || []);
        } catch (error) {
            console.error("Error fetching treatments:", error);
        } finally {
            setLoading(false);
        }
    };

    const selectedTreatment = React.useMemo(
        () => treatments.find((t) => t.id === value),
        [treatments, value]
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal text-slate-900 border-slate-200 hover:border-[#76D7B6] transition-colors"
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedTreatment ? (
                            <>
                                <div 
                                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: selectedTreatment.color }} 
                                />
                                <span className="truncate font-medium">{selectedTreatment.nombre}</span>
                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-50">
                                    {selectedTreatment.categoria}
                                </Badge>
                            </>
                        ) : (
                            <span className="text-slate-400">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Buscar tratamiento..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty>No se encontraron tratamientos.</CommandEmpty>
                        <CommandGroup>
                            {treatments
                                .filter((t) => 
                                    t.nombre.toLowerCase().includes(search.toLowerCase()) || 
                                    t.categoria.toLowerCase().includes(search.toLowerCase())
                                )
                                .map((treatment) => (
                                    <CommandItem
                                        key={treatment.id}
                                        value={treatment.id}
                                        onSelect={() => {
                                            onSelect(treatment.id === value ? null : treatment);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                        className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full shrink-0" 
                                                style={{ backgroundColor: treatment.color }} 
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{treatment.nombre}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <span>{treatment.categoria}</span>
                                                    <span>•</span>
                                                    <span>{treatment.duracion} min</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Check
                                            className={cn(
                                                "h-4 w-4 text-[#76D7B6]",
                                                value === treatment.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </CommandList>
                    <div className="p-2 border-t bg-slate-50/50 flex justify-center">
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-[#76D7B6]" />}
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
