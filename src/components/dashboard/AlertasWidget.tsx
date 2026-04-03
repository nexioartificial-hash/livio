"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Clock, CheckCircle, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Alerta {
    id: string;
    mensaje: string;
    hora: string;
    tipo: "warning" | "info" | "success" | string;
}

interface AlertasWidgetProps {
    alertas: Alerta[];
    onDismiss: (id: string) => void;
    onAdd: (mensaje: string, tipo: string) => Promise<void>;
}

const icons: Record<string, React.ReactNode> = {
    warning: <AlertCircle className="h-3.5 w-3.5" />,
    info: <Clock className="h-3.5 w-3.5" />,
    success: <CheckCircle className="h-3.5 w-3.5" />,
};

const styles: Record<string, any> = {
    warning: { bg: "bg-red-50 border-red-100", icon: "text-red-500 bg-red-100", text: "text-red-700", sub: "text-red-500" },
    info:    { bg: "bg-blue-50 border-blue-100",   icon: "text-blue-500 bg-blue-100",   text: "text-blue-700",   sub: "text-blue-500"   },
    success: { bg: "bg-emerald-50 border-emerald-100", icon: "text-emerald-600 bg-emerald-100", text: "text-emerald-700", sub: "text-emerald-500" },
    default: { bg: "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800", icon: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", sub: "text-slate-500 dark:text-slate-400" },
};

export function AlertasWidget({ alertas, onDismiss, onAdd }: AlertasWidgetProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [type, setType] = useState("info");

    const urgentes = alertas.filter(a => a.tipo === "warning" || a.tipo === "noshow").length;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsAdding(true);
        try {
            await onAdd(message, type);
            setMessage("");
            setType("info");
            setOpen(false);
        } catch (error) {
            console.error("Error creating alert:", error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="bg-gradient-to-b from-white to-slate-100 dark:from-slate-950 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.07)] p-5 flex flex-col h-full"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Alertas</h3>
                    {urgentes > 0 && (
                        <span className="text-[10px] font-bold bg-red-50 text-red-500 border border-red-100 rounded-full px-2 py-0.5">
                            {urgentes}
                        </span>
                    )}
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-accent">
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nueva Alerta</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="message">Mensaje</Label>
                                <Input 
                                    id="message" 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    placeholder="Ej: Revisar stock de insumos"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Alerta</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Información (Azul)</SelectItem>
                                        <SelectItem value="warning">Urgente (Rojo)</SelectItem>
                                        <SelectItem value="success">Éxito (Verde)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isAdding || !message.trim()}>
                                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Crear Alerta
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar flex-1">
                {alertas.length > 0 ? (
                    alertas.map((alert, i) => {
                        const s = styles[alert.tipo] || styles.default;
                        return (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${s.bg}`}
                            >
                                <div className={`p-1 rounded-lg flex-shrink-0 ${s.icon}`}>
                                    {icons[alert.tipo] || <AlertCircle className="h-3.5 w-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold ${s.text} truncate`}>{alert.mensaje}</p>
                                    <p className={`text-[10px] ${s.sub} mt-0.5`}>{alert.hora}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => onDismiss(alert.id)}
                                    className="h-6 w-6 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3">
                            <AlertCircle className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay alertas activas</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1 max-w-[140px]">El sistema te notificará cuando haya novedades</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
