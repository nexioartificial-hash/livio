"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Plus, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Tarea {
    id: string;
    titulo: string;
    fecha: string;
    completada: boolean;
}

interface TareasWidgetProps {
    tareas: Tarea[];
    onToggle: (id: string, completed: boolean) => void;
    onAdd: (titulo: string) => Promise<void>;
}

export function TareasWidget({ tareas, onToggle, onAdd }: TareasWidgetProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [open, setOpen] = useState(false);
    const [newTitulo, setNewTitulo] = useState("");

    const pendientes = tareas.filter(t => !t.completada).length;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitulo.trim()) return;
        
        const formattedTitulo = newTitulo.trim().charAt(0).toUpperCase() + newTitulo.trim().slice(1).toLowerCase();
        
        setIsAdding(true);
        try {
            await onAdd(formattedTitulo);
            setNewTitulo("");
            setOpen(false);
        } catch (error) {
            console.error("Error adding tarea:", error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col h-full"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-[#76D7B6]" />
                    Tareas Pendientes
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                        {pendientes}
                    </span>
                    
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <button className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-[#76D7B6]">
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nueva Tarea</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAdd} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="titulo">¿Qué hay que hacer?</Label>
                                    <Input 
                                        id="titulo" 
                                        value={newTitulo} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length > 0) {
                                                setNewTitulo(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
                                            } else {
                                                setNewTitulo(val);
                                            }
                                        }} 
                                        placeholder="Ej: Llamar a proveedor, revisar stock..."
                                        required
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isAdding || !newTitulo.trim()}>
                                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Crear Tarea
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {tareas.length > 0 ? (
                    tareas.map((tarea, i) => (
                        <motion.div
                            key={tarea.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100"
                        >
                            <Checkbox
                                id={`tarea-${tarea.id}`}
                                checked={tarea.completada}
                                onCheckedChange={(checked) => onToggle(tarea.id, checked as boolean)}
                                className="h-5 w-5 border-slate-300"
                            />
                            <div className="flex-1 min-w-0">
                                <label 
                                    htmlFor={`tarea-${tarea.id}`}
                                    className={`text-xs font-medium cursor-pointer block truncate ${
                                        tarea.completada ? 'line-through text-slate-400' : 'text-slate-700'
                                    }`}
                                >
                                    {tarea.titulo}
                                </label>
                                <p className="text-[10px] text-slate-400">{tarea.fecha}</p>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                            <CheckSquare className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Carga tus tareas de hoy</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[140px]">Organiza tu jornada para un mejor seguimiento</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
