"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
    FileDown, 
    Upload, 
    FileSpreadsheet, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicId: string;
    onSuccess: () => void;
}

export default function ImportStockModal({
    isOpen,
    onClose,
    clinicId,
    onSuccess,
}: ImportStockModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const droppedFile = acceptedFiles[0];
        if (!droppedFile) return;
        setFile(droppedFile);
        parseFile(droppedFile);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
        },
        multiple: false,
    });

    const parseFile = (file: File) => {
        const reader = new FileReader();

        if (file.name.endsWith(".csv")) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setPreviewData(results.data.slice(0, 5));
                },
            });
        } else {
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setPreviewData(jsonData.slice(0, 5));
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleImport = async () => {
        if (!file || !clinicId) return;
        setIsImporting(true);
        setProgress(0);

        try {
            const dataToProcess: any[] = await new Promise((resolve) => {
                if (file.name.endsWith(".csv")) {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => resolve(results.data),
                    });
                } else {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: "array" });
                        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        resolve(jsonData);
                    };
                    reader.readAsArrayBuffer(file);
                }
            });

            // Mapeo inteligente de columnas
            const mappedData = dataToProcess.map((row) => {
                const nombre = row.nombre || row.Producto || row.Name || row.item || "";
                const categoria = row.categoria || row.Category || row.Tipo || "Otros";
                const stock_actual = parseInt(row.stock || row.stock_actual || row.Cantidad || "0");
                const stock_minimo = parseInt(row.minimo || row.stock_minimo || row.Min || "0");
                const proveedor = row.proveedor || row.Provider || row.Laboratorio || "";
                const caduca = row.caduca || row.Fecha_Vencimiento || row.Expiry || null;
                const lote = row.lote || row.Batch || "";

                return {
                    clinic_id: clinicId,
                    nombre,
                    categoria,
                    stock_actual,
                    stock_minimo,
                    proveedor,
                    caduca: caduca ? new Date(caduca).toISOString().split('T')[0] : null,
                    lote,
                    activo: true,
                };
            }).filter(item => item.nombre);

            // Importar en batches de 50 para evitar timeouts
            const batchSize = 50;
            for (let i = 0; i < mappedData.length; i += batchSize) {
                const batch = mappedData.slice(i, i + batchSize);
                const { error } = await supabase.from("inventario").insert(batch);
                if (error) throw error;
                setProgress(Math.round(((i + batch.length) / mappedData.length) * 100));
            }

            toast.success(`Se importaron ${mappedData.length} productos correctamente`);
            onSuccess();
            onClose();
            setFile(null);
            setPreviewData([]);
        } catch (error: any) {
            console.error("Error importing stock:", error);
            toast.error("Error en la importación: " + error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                nombre: "Lidocaína 2%",
                categoria: "Anestesia",
                stock_actual: 50,
                stock_minimo: 10,
                proveedor: "Dentaltix",
                caduca: "2026-12-31",
                lote: "L12345"
            },
            {
                nombre: "Resina 3M A2",
                categoria: "Resina",
                stock_actual: 100,
                stock_minimo: 20,
                proveedor: "Henry Schein",
                caduca: "2025-06-30",
                lote: "L98765"
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Stock");
        XLSX.writeFile(wb, "Livio_Plantilla_Stock.xlsx");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        Importar Stock desde Excel
                    </DialogTitle>
                    <DialogDescription>
                        Carga masivamente tus productos. Puedes usar nuestra plantilla para asegurar el formato.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!file ? (
                        <div 
                            {...getRootProps()} 
                            className={cn(
                                "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                                isDragActive ? "border-accent bg-accent/5" : "border-slate-200 dark:border-slate-700 hover:border-accent/50"
                            )}
                        >
                            <input {...getInputProps()} />
                            <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                                <Upload className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Click para subir o arrastra un archivo</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Excel (.xlsx, .xls) o CSV soportados</p>
                            </div>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 text-accent border-accent"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    downloadTemplate();
                                }}
                            >
                                <FileDown className="h-4 w-4 mr-2" /> Descargar Plantilla
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-green-600">
                                        <FileSpreadsheet className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{file.name}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => { setFile(null); setPreviewData([]); }}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {previewData.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Vista previa de datos</p>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-[10px] border-collapse">
                                            <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                                                <tr>
                                                    {Object.keys(previewData[0]).slice(0, 4).map(key => (
                                                        <th key={key} className="p-2 text-left font-bold text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="border-b last:border-none">
                                                        {Object.values(row).slice(0, 4).map((val: any, j) => (
                                                            <td key={j} className="p-2 text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{val}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {isImporting && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                        <span>Procesando...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-accent h-full transition-all duration-300" 
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isImporting}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleImport} 
                        disabled={!file || isImporting}
                        className="bg-accent hover:bg-accent/90 text-slate-900 dark:text-white font-bold min-w-[120px]"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importando...
                            </>
                        ) : (
                            "Comenzar Importación"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
