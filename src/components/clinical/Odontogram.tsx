"use client";

import { useState } from "react";
import {
    Undo2, Redo2, RotateCcw, FileDown, Printer,
    User, Baby, Users, AlertCircle, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// --- TYPES & CONSTANTS ---
export type ToothStatus = "sano" | "caries" | "obturacion" | "corona" | "implante" | "ausente" | "endodoncia" | "fractura";

interface ToothData {
    status: ToothStatus;
    notes?: string;
    professionalId?: string;
}

interface OdontogramProps {
    initialState?: Record<number, ToothData>;
    onStateChange?: (state: Record<number, ToothData>) => void;
    readOnly?: boolean;
    currentProfessionalId?: string;
}

const STATUS_CONFIG: Record<ToothStatus, { fill: string; stroke: string; label: string; textColor: string }> = {
    sano: { fill: "#E2F7F1", stroke: "#76D7B6", label: "Sano", textColor: "text-[#76D7B6]" },
    caries: { fill: "#FFE2E2", stroke: "#FF6B6B", label: "Caries", textColor: "text-[#FF6B6B]" },
    obturacion: { fill: "#E2F0FF", stroke: "#4DABF7", label: "Obturación", textColor: "text-[#4DABF7]" },
    corona: { fill: "#FFF4E2", stroke: "#FFD43B", label: "Corona", textColor: "text-[#FAB005]" },
    implante: { fill: "#F3F0FF", stroke: "#845EF7", label: "Implante", textColor: "text-[#845EF7]" },
    ausente: { fill: "#F8F9FA", stroke: "#ADB5BD", label: "Ausente", textColor: "text-[#868E96]" },
    endodoncia: { fill: "#E3FAFC", stroke: "#22B8CF", label: "Endodoncia", textColor: "text-[#22B8CF]" },
    fractura: { fill: "#FFF9DB", stroke: "#F59F00", label: "Fractura", textColor: "text-[#F59F00]" },
};

// Quadrant Tooth IDs (FDI system)
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const PED_UPPER_RIGHT = [55, 54, 53, 52, 51];
const PED_UPPER_LEFT = [61, 62, 63, 64, 65];
const PED_LOWER_RIGHT = [85, 84, 83, 82, 81];
const PED_LOWER_LEFT = [71, 72, 73, 74, 75];

// Helper to get tooth SVG path (simplified schematic)
const getToothShape = (isUpper: boolean, toothNum: number, isMolar: boolean) => {
    // Basic schematic tooth shape (shield-like)
    return isUpper
        ? "M2,10 Q2,2 14,2 Q26,2 26,10 L26,30 Q26,38 14,38 Q2,38 2,30 Z"
        : "M2,30 Q2,38 14,38 Q26,38 26,30 L26,10 Q26,2 14,2 Q2,2 2,10 Z";
};

export function Odontogram({ initialState = {}, onStateChange, readOnly = false, currentProfessionalId = "dr-juan" }: OdontogramProps) {
    const [view, setView] = useState<"adult" | "pediatric">("adult");
    const [toothStates, setToothStates] = useState<Record<number, ToothData>>(initialState);
    const [history, setHistory] = useState<Record<number, ToothData>[]>(Object.keys(initialState).length > 0 ? [initialState] : [{}]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [showOnlyMine, setShowOnlyMine] = useState(false);
    const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);

    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLegendExpandOpen, setIsLegendExpandOpen] = useState(false);
    const [editStatus, setEditStatus] = useState<ToothStatus>("sano");
    const [editNotes, setEditNotes] = useState("");

    const addToHistory = (newState: Record<number, ToothData>) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setHistoryIndex(historyIndex - 1);
            setToothStates(prevState);
            onStateChange?.(prevState);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setHistoryIndex(historyIndex + 1);
            setToothStates(nextState);
            onStateChange?.(nextState);
        }
    };

    const reset = () => {
        if (confirm("¿Estás seguro de que quieres borrar todos los cambios?")) {
            setToothStates({});
            addToHistory({});
            onStateChange?.({});
        }
    };

    const handleToothClick = (id: number) => {
        if (readOnly) return;
        setSelectedTooth(id);
        const currentData = toothStates[id];
        setEditStatus(currentData?.status || "sano");
        setEditNotes(currentData?.notes || "");
        setIsEditModalOpen(true);
    };

    const saveToothState = () => {
        if (selectedTooth === null) return;
        const updated = {
            ...toothStates,
            [selectedTooth]: {
                status: editStatus,
                notes: editNotes,
                professionalId: currentProfessionalId
            }
        };
        setToothStates(updated);
        addToHistory(updated);
        onStateChange?.(updated);
        setIsEditModalOpen(false);
    };

    // --- RENDER HELPERS ---
    const renderToothItem = (id: number, i: number, ids: number[], startX: number, y: number, isUpper: boolean) => {
        const data = toothStates[id];
        const status = data?.status || "sano";
        const config = STATUS_CONFIG[status];
        const isMine = !data || data.professionalId === currentProfessionalId;
        const isHidden = showOnlyMine && data && !isMine;

        const toothNum = id % 10;
        const isMolar = toothNum >= 6;

        // Standardized size and spacing for all teeth
        const toothWidth = 28;
        const xStep = 34;

        const xOffset = i * xStep;

        const x = startX + xOffset;
        const shape = getToothShape(isUpper, toothNum, isMolar);
        const isHovered = hoveredTooth === id;

        return (
            <Tooltip key={id}>
                <TooltipTrigger asChild>
                    {/* Position Wrapper (Never scales) */}
                    <g transform={`translate(${x}, ${y})`}>
                        {/* Interaction Wrapper (Scales safely inside) */}
                        <g
                            className={`cursor-pointer transition-all duration-300 group ${isHidden ? "opacity-20 grayscale pointer-events-none" : ""
                                }`}
                            style={{
                                transform: isHovered ? "scale(1.12)" : "scale(1)",
                                transformBox: 'fill-box',
                                transformOrigin: 'center',
                                transition: 'transform 0.2s ease-out, filter 0.2s ease-out'
                            }}
                            onClick={() => handleToothClick(id)}
                            onMouseEnter={() => setHoveredTooth(id)}
                            onMouseLeave={() => setHoveredTooth(null)}
                        >
                            <path
                                d={shape}
                                fill={config.fill}
                                stroke={selectedTooth === id ? "#76D7B6" : config.stroke}
                                strokeWidth={selectedTooth === id ? 2.5 : 1.5}
                                className={`transition-all ${selectedTooth === id ? "drop-shadow-[0_0_8px_rgba(118,215,182,0.6)]" : "group-hover:drop-shadow-sm"
                                    } ${status === "ausente" ? "opacity-30" : ""}`}
                            />

                            {status !== "sano" && !isHidden && (
                                <circle
                                    cx={toothWidth / 2}
                                    cy={isUpper ? 12 : 26}
                                    r="3.5"
                                    fill={config.stroke}
                                    className="animate-pulse opacity-50 shadow-sm"
                                />
                            )}

                            <text
                                x={toothWidth / 2}
                                y={isUpper ? -12 : 58}
                                textAnchor="middle"
                                className={`text-[10px] font-bold transition-colors pointer-events-none ${selectedTooth === id ? "fill-[#76D7B6]" : "fill-slate-400 dark:fill-slate-500 font-mono"
                                    }`}
                            >
                                {id}
                            </text>
                        </g>
                    </g>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px] py-1.5 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-lg">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">Diente {id} - {config.label}</span>
                        {data?.notes && <span className="text-[10px] text-slate-500 italic max-w-[150px] truncate">"{data.notes}"</span>}
                        {data?.professionalId && (
                            <span className="text-[9px] text-[#76D7B6] font-medium flex items-center gap-1 mt-0.5 border-t pt-0.5">
                                <User className="h-2.5 w-2.5" /> {data.professionalId === currentProfessionalId ? "Tú" : data.professionalId}
                            </span>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    };

    const renderTeethQuadrant = (ids: number[], startX: number, y: number, isUpper: boolean) => {
        return (
            <g>
                {ids.map((id, i) => id !== hoveredTooth && renderToothItem(id, i, ids, startX, y, isUpper))}
            </g>
        );
    };

    const stats = Object.values(toothStates).reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <TooltipProvider>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                {/* Header Controls */}
                <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between border-b gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                            <Button
                                variant={view === "adult" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8 text-[11px] gap-1.5"
                                onClick={() => setView("adult")}
                            >
                                <User className="h-3.5 w-3.5" /> Adulto
                            </Button>
                            <Button
                                variant={view === "pediatric" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8 text-[11px] gap-1.5"
                                onClick={() => setView("pediatric")}
                            >
                                <Baby className="h-3.5 w-3.5" /> Pediátrico
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="only-mine"
                                checked={showOnlyMine}
                                onCheckedChange={(v: boolean) => setShowOnlyMine(v)}
                            />
                            <Label htmlFor="only-mine" className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Users className="h-3 w-3" /> Solo míos
                            </Label>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border-r pr-2 mr-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={historyIndex <= 0}>
                                <Undo2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={historyIndex >= history.length - 1}>
                                <Redo2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={reset}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
                            <Printer className="h-3.5 w-3.5" /> Imprimir
                        </Button>
                    </div>
                </div>

                {/* Legend */}
                <div className="px-6 py-2 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 border-b overflow-x-auto gap-4">
                    <div className="flex gap-4 min-w-max">
                        {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.fill, border: `1.5px solid ${cfg.stroke}` }}></div>
                                {cfg.label}
                                {stats[key] && <span className="font-bold text-slate-900 dark:text-white">({stats[key]})</span>}
                            </div>
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2 text-[#76D7B6]"
                        onClick={() => setIsLegendExpandOpen(true)}
                    >
                        Ver más estados
                    </Button>
                </div>

                {/* SVG */}
                <div className="p-6">
                    <div className="relative w-full overflow-x-auto">
                        <svg viewBox="0 0 650 280" className="w-full min-w-[620px] h-auto select-none transition-all">
                            {/* Jaw Backdrop Labels (Moved further away for breathing room) */}
                            <text x="325" y="25" textAnchor="middle" className="text-[12px] font-black fill-slate-200 dark:fill-slate-800/50 uppercase tracking-[0.4em] pointer-events-none">SUPERIOR</text>
                            <text x="325" y="265" textAnchor="middle" className="text-[12px] font-black fill-slate-200 dark:fill-slate-800/50 uppercase tracking-[0.4em] pointer-events-none">INFERIOR</text>
                            <line x1="325" y1="40" x2="325" y2="240" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth={1} strokeDasharray="4 4" />

                            {view === "adult" ? (
                                <g transform="translate(10, 50)">
                                    {renderTeethQuadrant(UPPER_RIGHT, 20, 10, true)}
                                    {renderTeethQuadrant(UPPER_LEFT, 335, 10, true)}
                                    {renderTeethQuadrant(LOWER_RIGHT, 20, 130, false)}
                                    {renderTeethQuadrant(LOWER_LEFT, 335, 130, false)}
                                </g>
                            ) : (
                                <g transform="translate(10, 50)">
                                    {renderTeethQuadrant(PED_UPPER_RIGHT, 70, 10, true)}
                                    {renderTeethQuadrant(PED_UPPER_LEFT, 335, 10, true)}
                                    {renderTeethQuadrant(PED_LOWER_RIGHT, 70, 130, false)}
                                    {renderTeethQuadrant(PED_LOWER_LEFT, 335, 130, false)}
                                </g>
                            )}

                            {hoveredTooth && (
                                <g transform="translate(10, 50)">
                                    {(() => {
                                        const squads = view === "adult"
                                            ? [{ ids: UPPER_RIGHT, x: 20, y: 10, u: true }, { ids: UPPER_LEFT, x: 335, y: 10, u: true }, { ids: LOWER_RIGHT, x: 20, y: 130, u: false }, { ids: LOWER_LEFT, x: 335, y: 130, u: false }]
                                            : [{ ids: PED_UPPER_RIGHT, x: 70, y: 10, u: true }, { ids: PED_UPPER_LEFT, x: 335, y: 10, u: true }, { ids: PED_LOWER_RIGHT, x: 70, y: 130, u: false }, { ids: PED_LOWER_LEFT, x: 335, y: 130, u: false }];
                                        const squad = squads.find(s => s.ids.includes(hoveredTooth));
                                        return squad ? renderToothItem(hoveredTooth, squad.ids.indexOf(hoveredTooth), squad.ids, squad.x, squad.y, squad.u) : null;
                                    })()}
                                </g>
                            )}

                            {/* Quadrant indicators */}
                            <text x="180" y="135" textAnchor="middle" className="text-[9px] fill-slate-400/30 dark:fill-slate-700/40 font-black uppercase tracking-widest">Q1</text>
                            <text x="470" y="135" textAnchor="middle" className="text-[9px] fill-slate-400/30 dark:fill-slate-700/40 font-black uppercase tracking-widest">Q2</text>
                            <text x="470" y="175" textAnchor="middle" className="text-[9px] fill-slate-400/30 dark:fill-slate-700/40 font-black uppercase tracking-widest">Q3</text>
                            <text x="180" y="175" textAnchor="middle" className="text-[9px] fill-slate-400/30 dark:fill-slate-700/40 font-black uppercase tracking-widest">Q4</text>
                        </svg>
                    </div>
                </div>

                {/* Modals */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                Diente #{selectedTooth}
                                {selectedTooth && toothStates[selectedTooth] && (
                                    <Badge className={`text-[10px] ${STATUS_CONFIG[toothStates[selectedTooth].status].textColor}`} variant="outline">
                                        {STATUS_CONFIG[toothStates[selectedTooth].status].label}
                                    </Badge>
                                )}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                    <button
                                        key={key}
                                        onClick={() => setEditStatus(key as ToothStatus)}
                                        className={`px-1 py-1.5 rounded-lg border text-[9px] font-bold transition-all flex flex-col items-center gap-1 ${editStatus === key ? "ring-2 ring-[#76D7B6] bg-slate-50" : "hover:bg-slate-50 border-slate-200"}`}
                                        style={{ borderColor: editStatus === key ? "#76D7B6" : undefined }}
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.fill, border: `1.5px solid ${cfg.stroke}` }}></div>
                                        {cfg.label}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Observaciones</Label>
                                <Input
                                    placeholder="Notas clínicas..."
                                    value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    className="text-sm h-9"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                            <Button size="sm" className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold" onClick={saveToothState}>Guardar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isLegendExpandOpen} onOpenChange={setIsLegendExpandOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader><DialogTitle>Estados Clínicos</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-3 py-4">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cfg.fill, border: `2px solid ${cfg.stroke}` }}></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-900">{cfg.label}</span>
                                        <span className="text-[9px] text-slate-500 uppercase">Activo</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
