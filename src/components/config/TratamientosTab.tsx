"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Clock,
    DollarSign,
    Filter,
    Loader2,
    Sparkles,
    Stethoscope,
    ArrowUpDown,
    TrendingUp
} from "lucide-react";
import { TratamientoModal } from "./TratamientoModal";
import { getTratamientos, deleteTratamiento, seedTratamientos, updateTratamientosPrecios } from "@/app/actions/tratamientos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface Tratamiento {
    id: string;
    categoria: string;
    nombre: string;
    duracion_min: number;
    precio_promedio: number;
}

export function TratamientosTab({ clinicId }: { clinicId: string }) {
    const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("Todas");
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTratamiento, setSelectedTratamiento] = useState<Tratamiento | null>(null);
    const [sortField, setSortField] = useState<"precio_promedio" | "duracion_min" | "nombre">("nombre");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [bulkPercent, setBulkPercent] = useState<string>("");
    const [updatingPrecios, setUpdatingPrecios] = useState(false);

    const fetchTratamientos = useCallback(async () => {
        setLoading(true);
        const res = await getTratamientos(clinicId);
        if (res.success) {
            setTratamientos(res.data || []);
        } else {
            toast.error("Error al cargar tratamientos");
        }
        setLoading(false);
    }, [clinicId]);

    useEffect(() => {
        if (clinicId) fetchTratamientos();
    }, [clinicId, fetchTratamientos]);

    const handleSeed = async () => {
        setLoading(true);
        const res = await seedTratamientos(clinicId);
        if (res.success) {
            toast.success("Tratamientos estándar cargados correctamente");
            fetchTratamientos();
        } else {
            toast.error(res.error || "Error al cargar semillas");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este tratamiento?")) return;
        
        const res = await deleteTratamiento(id, clinicId);
        if (res.success) {
            toast.success("Tratamiento eliminado");
            fetchTratamientos();
        } else {
            toast.error(res.error || "Error al eliminar");
        }
    };

    const handleBulkPriceUpdate = async () => {
        const percent = parseFloat(bulkPercent);
        if (isNaN(percent) || percent <= 0) {
            toast.error("Ingresa un porcentaje válido");
            return;
        }

        if (!confirm(`¿Estás seguro de aumentar TODOS los precios un ${percent}%?`)) return;

        setUpdatingPrecios(true);
        const res = await updateTratamientosPrecios(clinicId, percent);
        if (res.success) {
            toast.success(`Precios actualizados (${res.count} tratamientos)`);
            setBulkPercent("");
            fetchTratamientos();
        } else {
            toast.error(res.error || "Error al actualizar precios");
        }
        setUpdatingPrecios(false);
    };

    const handleEdit = (t: Tratamiento) => {
        setSelectedTratamiento(t);
        setModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedTratamiento(null);
        setModalOpen(true);
    };

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const filteredTratamientos = tratamientos
        .filter(t => {
            const matchesSearch = t.nombre.toLowerCase().includes(search.toLowerCase()) || 
                                 t.categoria.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = categoryFilter === "Todas" || t.categoria === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            const factor = sortOrder === "asc" ? 1 : -1;
            if (sortField === "nombre") return a.nombre.localeCompare(b.nombre) * factor;
            return ((a[sortField] || 0) - (b[sortField] || 0)) * factor;
        });

    return (
        <div className="space-y-6 relative pb-20">
            {/* Header / Summary */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Tratamientos
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold">
                            {tratamientos.length} configurados
                        </Badge>
                    </h2>
                    <p className="text-sm text-slate-500">Configura tus servicios, tiempos y precios de referencia.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar servicio..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-white border-slate-200"
                        />
                    </div>

                    {/* Bulk Update UI */}
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 pl-3 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">% Aumento</span>
                        </div>
                        <div className="relative w-20">
                            <Input
                                type="number"
                                placeholder="0"
                                value={bulkPercent}
                                onChange={(e) => setBulkPercent(e.target.value)}
                                className="h-8 pr-6 text-xs font-bold rounded-xl border-none bg-white shadow-inner focus-visible:ring-1 focus-visible:ring-[#10B981]"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                        </div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold px-3 gap-1.5"
                            onClick={handleBulkPriceUpdate}
                            disabled={updatingPrecios || !bulkPercent || tratamientos.length === 0}
                        >
                            {updatingPrecios ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Plus className="h-3 w-3" />
                            )}
                            Aplicar a todos
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
                    <Filter className="h-3 w-3" /> Filtrar por:
                </div>
                
                <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                >
                    <SelectTrigger className="w-full md:w-[240px] h-10 rounded-xl bg-white border-slate-200 shadow-sm font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                            <SelectValue placeholder="Categoría" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                        <SelectItem value="Todas" className="font-semibold py-2.5">Todas las categorías</SelectItem>
                        {CATEGORIAS.map(cat => (
                            <SelectItem 
                                key={cat} 
                                value={cat}
                                className="font-semibold py-2.5"
                            >
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Main Table */}
            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b">
                            <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-12">Categoría</TableHead>
                            <TableHead 
                                className="font-bold text-[10px] text-slate-400 uppercase tracking-widest cursor-pointer hover:text-[#10B981] transition-colors h-12"
                                onClick={() => toggleSort("nombre")}
                            >
                                <div className="flex items-center gap-1">
                                    Tratamiento <ArrowUpDown className="h-3 w-3 opacity-50" />
                                </div>
                            </TableHead>
                            <TableHead 
                                className="font-bold text-[10px] text-slate-400 uppercase tracking-widest cursor-pointer hover:text-[#10B981] transition-colors h-12"
                                onClick={() => toggleSort("duracion_min")}
                            >
                                <div className="flex items-center gap-1">
                                    Duración <ArrowUpDown className="h-3 w-3 opacity-50" />
                                </div>
                            </TableHead>
                            <TableHead 
                                className="font-bold text-[10px] text-slate-400 uppercase tracking-widest cursor-pointer hover:text-[#10B981] transition-colors h-12"
                                onClick={() => toggleSort("precio_promedio")}
                            >
                                <div className="flex items-center gap-1">
                                    Precio Prom. <ArrowUpDown className="h-3 w-3 opacity-50" />
                                </div>
                            </TableHead>
                            <TableHead className="text-right font-bold text-[10px] text-slate-400 uppercase tracking-widest pr-6 h-12">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-300" />
                                </TableCell>
                            </TableRow>
                        ) : filteredTratamientos.length > 0 ? (
                            filteredTratamientos.map((t) => (
                                <TableRow key={t.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                                    <TableCell className="pl-6">
                                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-bold px-2 py-0.5">
                                            {t.categoria}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-semibold text-sm text-slate-900">{t.nombre}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                            {t.duracion_min} min
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-0.5 font-semibold text-slate-900 text-sm">
                                            <span className="text-slate-400 font-normal mr-1">$</span>
                                            {Number(t.precio_promedio).toLocaleString('es-AR')}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-400 hover:text-[#10B981]"
                                                onClick={() => handleEdit(t)}
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                onClick={() => handleDelete(t.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-4 max-w-xs mx-auto">
                                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                                            <Stethoscope className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">No hay tratamientos cargados</p>
                                            <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                                Comienza cargando los servicios estándar o crea uno personalizado.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="rounded-xl border-dashed border-slate-300 gap-2 h-10 px-4"
                                                onClick={handleSeed}
                                                disabled={loading}
                                            >
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                                Cargar 12 Estándar
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="bg-slate-900 text-white rounded-xl h-10 px-4"
                                                onClick={handleAdd}
                                            >
                                                Crear uno nuevo
                                            </Button>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {/* Footer Spacer */}
                        <TableRow className="border-none bg-slate-50/10">
                             <TableCell colSpan={5} className="py-2 text-center">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-300">
                                    Livio Intelligent Solutions
                                </p>
                             </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* FAB + Modal */}
            <Button
                onClick={handleAdd}
                className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#10B981] hover:bg-[#059669] text-white shadow-2xl shadow-emerald-200 z-50 group transition-all hover:scale-110 active:scale-95"
            >
                <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
            </Button>

            <TratamientoModal
                clinicId={clinicId}
                open={modalOpen}
                setOpen={setModalOpen}
                initialData={selectedTratamiento}
                onSuccess={fetchTratamientos}
            />
        </div>
    );
}
