"use client";

import { useState, useEffect } from "react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    Plus, 
    Search, 
    Package, 
    AlertTriangle, 
    TrendingDown, 
    Trash2, 
    Edit, 
    MoreVertical,
    CalendarClock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventario, deleteProducto, seedInventarioDefault } from "@/app/actions/inventario";
import { ProductModal } from "./ProductModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { differenceInDays, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InventarioTabProps {
    clinicId: string;
}

const CATEGORIAS_FILTRO = [
    "Todas",
    "Consumibles",
    "Restauración",
    "Anestesia",
    "Impresión",
    "Cementación",
    "Instrumental",
    "Prevención",
    "Operatoria",
    "Implantes",
    "Ortodoncia",
    "Prótesis",
    "Cirugía",
    "Endodoncia",
    "Otros"
];

export function InventarioTab({ clinicId }: InventarioTabProps) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoriaFilter, setCategoriaFilter] = useState("Todas");
    const [stockBajoOnly, setStockBajoOnly] = useState(false);
    const [vencimientoProximoOnly, setVencimientoProximoOnly] = useState(false);
    
    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const fetchData = async () => {
        if (!clinicId) return;
        setLoading(true);
        const res = await getInventario(clinicId);
        if (res.success) {
            const data = res.data || [];
            setItems(data);

            // Alertas de vencimiento próximo (<= 10 días)
            const hoy = new Date();
            const porVencer = data.filter((i: any) => {
                if (!i.vencimiento) return false;
                const diff = differenceInDays(new Date(i.vencimiento), hoy);
                return diff >= 0 && diff <= 10;
            });

            // Usamos setTimeout para no disparar toasts mientras aún está montando
            if (porVencer.length > 0) {
                setTimeout(() => {
                    porVencer.forEach((item: any) => {
                        const dias = differenceInDays(new Date(item.vencimiento), hoy);
                        toast.warning(
                            `⚠️ ${item.producto} vence en ${dias === 0 ? "hoy" : `${dias} día${dias === 1 ? "" : "s"}`}.`,
                            { duration: 6000, id: `vencimiento-${item.id}` }
                        );
                    });
                }, 300);
            }
        } else {
            toast.error("Error al cargar el inventario: " + res.error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [clinicId]);

    const handleSeed = async () => {
        const promise = seedInventarioDefault(clinicId);
        toast.promise(promise, {
            loading: "Generando insumos de prueba...",
            success: (res) => {
                if (res.success) {
                    fetchData();
                    return res.message || "Inventario poblado exitosamente";
                }
                throw new Error((res as any).error);
            },
            error: "Error al sembrar datos"
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
        const res = await deleteProducto(id, clinicId);
        if (res.success) {
            toast.success("Producto eliminado");
            setItems(items.filter(i => i.id !== id));
        } else {
            toast.error("Error al eliminar: " + res.error);
        }
    };

    const filteredItems = items.filter(item => {
        const matchSearch = item.producto.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategoria = categoriaFilter === "Todas" || item.categoria === categoriaFilter;
        const isStockBajo = item.stock_actual <= item.stock_min;
        const matchStock = stockBajoOnly ? isStockBajo : true;
        
        const isVencimientoProximo = item.vencimiento ? differenceInDays(new Date(item.vencimiento), new Date()) <= 30 : false;
        const matchVencimiento = vencimientoProximoOnly ? isVencimientoProximo : true;

        return matchSearch && matchCategoria && matchStock && matchVencimiento;
    });

    // Metrics
    const totalValor = items.reduce((acc, curr) => acc + (curr.precio_unit * curr.stock_actual), 0);
    const itemsStockBajo = items.filter(i => i.stock_actual <= i.stock_min).length;
    
    // Alertas por vencimiento (menos de 30 días o vencido)
    const itemsProximosVencer = items.filter(i => {
        if (!i.vencimiento) return false;
        const diff = differenceInDays(new Date(i.vencimiento), new Date());
        return diff <= 30; // Includes past dates (negatives)
    }).length;

    return (
        <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-[#76D7B6]/20 border border-indigo-800 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Package className="h-32 w-32 text-indigo-200" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Package className="h-6 w-6 text-[#76D7B6]" />
                                Inventario
                            </h2>
                            <p className="text-indigo-200 mt-1 max-w-xl text-sm leading-relaxed">
                                Controlá los insumos de tu clínica odontológica. Seguí vencimientos, calculá gastos y mantené tu stock siempre al día.
                            </p>
                        </div>
                        
                        <div className="flex gap-2">
                            {items.length === 0 && !loading && (
                                <Button 
                                    onClick={handleSeed}
                                    variant="outline" 
                                    className="bg-transparent border-indigo-400 text-indigo-100 hover:bg-indigo-800 hover:text-white"
                                >
                                    Generar Prueba
                                </Button>
                            )}
                            <Button 
                                onClick={() => { setEditingItem(null); setModalOpen(true); }}
                                className="bg-[#76D7B6] text-indigo-950 hover:bg-[#5fc0a0] font-bold shadow-lg h-10 px-6 rounded-full"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {items.length === 0 ? "Agregar mi Primer Producto" : "Nuevo Producto"}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 text-indigo-200 mb-1">
                                <Package className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Productos Registrados</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{items.length}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 text-indigo-200 mb-1">
                                <TrendingDown className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Valor Monetario Estimado</span>
                            </div>
                            <p className="text-2xl font-bold text-white">${totalValor.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Alertas Activas</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn("text-2xl font-bold", itemsStockBajo > 0 ? "text-white" : "text-white")}>
                                        {itemsStockBajo} bajo stock
                                    </span>
                                    {itemsStockBajo > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-500/20 text-orange-200 border border-orange-500/30 px-2 py-0.5 rounded-full">
                                            <TrendingDown className="h-3 w-3" /> Reponer
                                        </span>
                                    )}
                                </div>
                                {itemsProximosVencer > 0 && (
                                    <p className="text-xs text-amber-300 font-bold mt-1">
                                        + {itemsProximosVencer} vencimientos próximos
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar insumos por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                            <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIAS_FILTRO.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        <div className="flex items-center space-x-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-slate-100" onClick={() => setStockBajoOnly(!stockBajoOnly)}>
                            <Switch id="stock-bajo" checked={stockBajoOnly} onCheckedChange={setStockBajoOnly} />
                            <Label htmlFor="stock-bajo" className="text-sm font-medium text-slate-700 cursor-pointer whitespace-nowrap">Solo Stock Bajo</Label>
                        </div>

                        <div className="flex items-center space-x-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-slate-100" onClick={() => setVencimientoProximoOnly(!vencimientoProximoOnly)}>
                            <Switch id="vencimiento-proximo" checked={vencimientoProximoOnly} onCheckedChange={setVencimientoProximoOnly} />
                            <Label htmlFor="vencimiento-proximo" className="text-sm font-medium text-slate-700 cursor-pointer whitespace-nowrap">Solo Vencimiento Próximo</Label>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-900">Producto</TableHead>
                                <TableHead className="font-semibold text-slate-900">Categoría</TableHead>
                                <TableHead className="font-semibold text-slate-900 w-[200px]">Disponibilidad</TableHead>
                                <TableHead className="font-semibold text-slate-900 hidden md:table-cell">Ubicación</TableHead>
                                <TableHead className="font-semibold text-slate-900 hidden lg:table-cell">Vencimiento</TableHead>
                                <TableHead className="font-semibold text-slate-900 text-right">Valor Unit</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                                            <div className="h-6 w-6 rounded-full border-2 border-[#76D7B6] border-t-transparent animate-spin" />
                                            <p className="text-sm">Cargando inventario...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                                            <Package className="h-8 w-8 text-slate-300" />
                                            <p className="text-sm font-medium">No se encontraron productos</p>
                                            {searchTerm || stockBajoOnly || vencimientoProximoOnly || categoriaFilter !== "Todas" ? (
                                                <p className="text-xs text-slate-400">Probá limpiando los filtros</p>
                                            ) : (
                                                <Button variant="link" onClick={() => { setEditingItem(null); setModalOpen(true); }} className="text-[#76D7B6]">
                                                    Añadir tu primer insumo
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => {
                                    const stockPercentage = Math.min(100, (item.stock_actual / (item.stock_min * 2 || 10)) * 100);
                                    let isLowStock = item.stock_actual <= item.stock_min;
                                    let progressColor = isLowStock ? "bg-orange-500" : "bg-emerald-500";
                                    if(item.stock_actual === 0) progressColor = "bg-red-500";
                                    
                                    let vencimientoBadge = null;
                                    if (item.vencimiento) {
                                        const vDate = new Date(item.vencimiento);
                                        const diasDiff = differenceInDays(vDate, new Date());
                                        const past = isPast(vDate) && diasDiff < 0; // Fix edge case today
                                        
                                        if (past) {
                                            vencimientoBadge = <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">Vencido</Badge>;
                                        } else if (diasDiff <= 30) {
                                            vencimientoBadge = <Badge className="bg-orange-100 text-orange-700 border-none font-bold">En {diasDiff} días</Badge>;
                                        } else {
                                            vencimientoBadge = <span className="text-sm text-slate-500">{format(vDate, 'MMM yyyy', { locale: es })}</span>;
                                        }
                                    } else {
                                        vencimientoBadge = <span className="text-sm text-slate-300 italic">Sin fecha</span>;
                                    }

                                    return (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <p className="font-bold text-slate-900">{item.producto}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-none">
                                                    {item.categoria}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5 w-[140px]">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className={isLowStock ? "text-orange-600" : "text-emerald-700"}>
                                                            {item.stock_actual}
                                                        </span>
                                                        <span className="text-slate-400 font-normal">Min: {item.stock_min}</span>
                                                    </div>
                                                    <Progress 
                                                        value={stockPercentage} 
                                                        className="h-1.5 bg-slate-100" 
                                                        indicatorClassName={progressColor} 
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <p className="text-sm text-slate-600">{item.ubicacion || "-"}</p>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <CalendarClock className="h-3 w-3 text-slate-400" />
                                                    {vencimientoBadge}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <p className="font-medium text-slate-700">${item.precio_unit.toLocaleString('es-AR')}</p>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { setEditingItem(item); setModalOpen(true); }} className="cursor-pointer">
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600 cursor-pointer">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <ProductModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                editingItem={editingItem}
                clinicId={clinicId}
                onSuccess={fetchData}
            />
        </div>
    );
}
