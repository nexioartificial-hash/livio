"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    Filter,
    ShieldCheck,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Upload,
} from "lucide-react";
import { ObrasSocialModal } from "./ObrasSocialModal";
import ImportObrasSocialesModal from "../obras-sociales/ImportObrasSocialesModal";
import { getObrasSociales, deleteObraSocial, toggleObraSocial, seedObrasSociales } from "@/app/actions/obras_sociales";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ObraSocial {
    id: string;
    clinic_id: string;
    nombre: string;
    plan: string;
    cobertura_pct: number;
    tratamientos: string[];
    activo: boolean;
}

interface ObrasSocialesTabProps {
    clinicId: string;
}

export function ObrasSocialesTab({ clinicId }: ObrasSocialesTabProps) {
    const [loading, setLoading] = useState(true);
    const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<"Activas" | "Todas">("Todas");
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedOS, setSelectedOS] = useState<ObraSocial | null>(null);

    const fetchOS = useCallback(async () => {
        setLoading(true);
        const res = await getObrasSociales(clinicId);
        if (res.success) {
            setObrasSociales(res.data || []);
        } else {
            toast.error("Error al cargar obras sociales");
        }
        setLoading(false);
    }, [clinicId]);

    useEffect(() => {
        fetchOS();
    }, [fetchOS]);

    const handleToggle = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setObrasSociales(prev => prev.map(os => os.id === id ? { ...os, activo: !currentStatus } : os));
        
        const res = await toggleObraSocial(id, clinicId, !currentStatus);
        if (!res.success) {
            toast.error("Error al cambiar estado");
            fetchOS(); // Rollback
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta obra social?")) return;
        const res = await deleteObraSocial(id, clinicId);
        if (res.success) {
            toast.success("Eliminada correctamente");
            fetchOS();
        } else {
            toast.error("Error al eliminar");
        }
    };

    const handleSeed = async () => {
        setLoading(true);
        const res = await seedObrasSociales(clinicId);
        if (res.success) {
            toast.success("Obras sociales cargadas");
            fetchOS();
        } else {
            toast.error(res.error || "Error al cargar semillas");
        }
        setLoading(false);
    };

    const filteredOS = useMemo(() => {
        return obrasSociales
            .filter(os => {
                const matchesSearch = 
                    os.nombre.toLowerCase().includes(search.toLowerCase()) || 
                    (os.plan && os.plan.toLowerCase().includes(search.toLowerCase()));
                const matchesFilter = filterType === "Todas" || os.activo;
                return matchesSearch && matchesFilter;
            });
    }, [obrasSociales, search, filterType]);

    return (
        <div className="space-y-6 relative pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Obras Sociales
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none font-bold">
                            {obrasSociales.length} configuradas
                        </Badge>
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Administra tus convenios, planes y niveles de cobertura.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar obra social o plan..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                        />
                    </div>
                    <Button 
                        variant="outline"
                        className="h-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900 gap-2 font-bold text-xs"
                        onClick={() => setImportModalOpen(true)}
                    >
                        <Upload className="h-4 w-4" /> Importar Excel
                    </Button>
                </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
                    <Filter className="h-3 w-3" /> Ver:
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterType("Activas")}
                        className={cn(
                            "rounded-lg px-4 h-8 text-[11px] font-bold transition-all",
                            filterType === "Activas" ? "bg-white dark:bg-slate-950 text-[#10B981] shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-900/50"
                        )}
                    >
                        Activas
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterType("Todas")}
                        className={cn(
                            "rounded-lg px-4 h-8 text-[11px] font-bold transition-all",
                            filterType === "Todas" ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-900/50"
                        )}
                    >
                        Todas
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50 border-b">
                            <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-6 h-12">Nombre y Plan</TableHead>
                            <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-12">Cobertura</TableHead>
                            <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest h-12">Tratamientos Incluidos</TableHead>
                            <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest text-center h-12">Estado</TableHead>
                            <TableHead className="text-right font-bold text-[10px] text-slate-400 uppercase tracking-widest pr-6 h-12">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center border-none">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                                        <p className="text-sm text-slate-400 font-medium">Cargando convenios...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredOS.length > 0 ? (
                            filteredOS.map((os) => {
                                let planesParsed: { nombre_plan: string, cobertura_pct: number }[] | null = null;
                                try {
                                    if (os.plan) {
                                        const parsed = JSON.parse(os.plan);
                                        if (Array.isArray(parsed)) {
                                            planesParsed = parsed;
                                        }
                                    }
                                } catch (e) {
                                    planesParsed = null;
                                }

                                return (
                                <TableRow key={os.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/50 transition-colors border-b last:border-0">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:bg-white dark:bg-slate-950 dark:group-hover:bg-slate-950 group-hover:shadow-sm transition-all shrink-0">
                                                <ShieldCheck className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{os.nombre}</p>
                                                {planesParsed ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {planesParsed.map((p, i) => (
                                                            <span key={i} className="text-[10px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                                                                {p.nombre_plan}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{os.plan || 'Sin plan especificado'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {planesParsed ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {planesParsed.map((p, i) => (
                                                        <Badge key={i} className={cn(
                                                            "border-none font-bold text-[9px] px-2 py-0.5 w-max",
                                                            p.cobertura_pct === 100 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-orange-50 text-orange-500"
                                                        )}>
                                                            {p.cobertura_pct}% {p.nombre_plan}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Badge className={cn(
                                                    "border-none font-bold text-[10px] px-2 py-0.5",
                                                    os.cobertura_pct === 100 ? "bg-[#10B981]/10 text-[#10B981]" : "bg-orange-50 text-orange-500"
                                                )}>
                                                    {os.cobertura_pct}%
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <div className="flex flex-wrap gap-1">
                                            {os.tratamientos && os.tratamientos.map((t, idx) => (
                                                <Badge key={idx} variant="outline" className="text-[9px] font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 py-0 px-2 h-5">
                                                    {t}
                                                </Badge>
                                            ))}
                                            {(!os.tratamientos || os.tratamientos.length === 0) && (
                                                <span className="text-[10px] text-slate-300 italic">Sin cobertura específica</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={os.activo}
                                            onCheckedChange={() => handleToggle(os.id, os.activo)}
                                            className="data-[state=checked]:bg-[#10B981] scale-90"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:bg-slate-950 hover:text-[#10B981] hover:shadow-sm"
                                                onClick={() => {
                                                    setSelectedOS(os);
                                                    setModalOpen(true);
                                                }}
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:bg-slate-950 hover:text-red-500 hover:shadow-sm"
                                                onClick={() => handleDelete(os.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center border-none">
                                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                                        <div className="h-16 w-16 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-200">
                                            <ShieldCheck className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1 text-center">
                                            <p className="text-base font-bold text-slate-900 dark:text-white">No hay convenios</p>
                                            <p className="text-sm text-slate-400 mx-auto text-center">
                                                {search ? "No se encontraron resultados para tu búsqueda." : "Configura tus obras sociales y prepagas para integrarlas con los turnos."}
                                            </p>
                                        </div>
                                        {!search && obrasSociales.length === 0 && (
                                            <div className="flex flex-col gap-2 w-full max-w-[250px] mt-2">
                                                <Button 
                                                    className="w-full rounded-xl bg-accent text-slate-900 dark:text-white font-bold text-sm hover:bg-accent/90 gap-2"
                                                    onClick={() => setImportModalOpen(true)}
                                                >
                                                    <Upload className="h-4 w-4" /> Importar CSV o Excel
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs px-6 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900"
                                                    onClick={handleSeed}
                                                >
                                                    Cargar 12 Estándar Argentina
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* FAB */}
            <Button
                className="fixed bottom-8 right-8 h-14 w-auto px-6 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl shadow-slate-400 flex items-center gap-3 active:scale-95 transition-all z-40 border border-white/10"
                onClick={() => {
                    setSelectedOS(null);
                    setModalOpen(true);
                }}
            >
                <div className="h-6 w-6 rounded-lg bg-[#10B981] flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight">Nueva Obra Social</span>
            </Button>

            <ObrasSocialModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSuccess={fetchOS}
                clinicId={clinicId}
                obraSocial={selectedOS}
            />

            <ImportObrasSocialesModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                clinicId={clinicId}
                onSuccess={fetchOS}
            />
        </div>
    );
}
