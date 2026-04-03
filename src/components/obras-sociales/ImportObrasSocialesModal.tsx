"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FileDown, Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImportObrasSocialesModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicId: string;
    onSuccess: () => void;
}

export default function ImportObrasSocialesModal({ isOpen, onClose, clinicId, onSuccess }: ImportObrasSocialesModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState<any[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) return;
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            if (selectedFile.name.endsWith(".csv")) {
                Papa.parse(selectedFile, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setPreview(results.data.slice(0, 5));
                    }
                });
            } else {
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet);
                setPreview(json.slice(0, 5));
            }
        };

        if (selectedFile.name.endsWith(".csv")) {
            reader.readAsText(selectedFile);
        } else {
            reader.readAsBinaryString(selectedFile);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"]
        },
        multiple: false
    });

    const handleImport = async () => {
        if (!file) return;
        setImporting(true);
        const toastId = toast.loading("Procesando archivo...");

        try {
            let dataToImport: any[] = [];

            if (file.name.endsWith(".csv")) {
                const text = await file.text();
                const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                dataToImport = result.data;
            } else {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                dataToImport = XLSX.utils.sheet_to_json(sheet);
            }

            if (dataToImport.length === 0) {
                throw new Error("El archivo está vacío");
            }

            // Normalizar datos (mapear columnas comunes)
            const normalizedData = dataToImport.map((row: any) => ({
                nombre: row.nombre || row.Nombre || row.OBRA_SOCIAL || row.ENTIDAD || "",
                codigo: String(row.codigo || row.Codigo || row.RNA || row.RNAS || row.ID || "").trim(),
                activo: true,
                clinic_id: clinicId
            })).filter(row => row.nombre.length > 0);

            if (normalizedData.length === 0) {
                throw new Error("No se encontraron datos válidos (asegúrate de tener una columna 'nombre')");
            }

            toast.loading(`Importando ${normalizedData.length} registros...`, { id: toastId });

            const { error } = await supabase
                .from("obras_sociales")
                .insert(normalizedData);

            if (error) throw error;

            toast.success(`¡Importación exitosa! ${normalizedData.length} obras sociales añadidas.`, { id: toastId });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Import error:", error);
            toast.error("Error al importar: " + error.message, { id: toastId });
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { nombre: "OSDE", codigo: "123456" },
            { nombre: "Swiss Medical", codigo: "SW-01" },
            { nombre: "Particular", codigo: "" }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "plantilla_obras_sociales.xlsx");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Upload className="h-5 w-5 text-accent" /> Importar Obras Sociales
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Sube un archivo Excel o CSV con los datos de tus prepagas.</p>

                <div className="space-y-6">
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                            isDragActive ? "border-accent bg-accent/5" : "border-slate-200 dark:border-slate-700 hover:border-accent/50 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900",
                            file && "border-solid border-accent bg-accent/5"
                        )}
                    >
                        <input {...getInputProps()} />
                        {file ? (
                            <>
                                <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-accent" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600 h-7" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview([]); }}>
                                    Quitar archivo
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Arrastra tu archivo aquí</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Soporta .xlsx, .xls o .csv</p>
                                </div>
                            </>
                        )}
                    </div>

                    {preview.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vista previa (5 filas)</p>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-[10px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                                        <tr>
                                            <th className="px-2 py-1.5 text-left font-medium text-slate-500 dark:text-slate-400">Nombre</th>
                                            <th className="px-2 py-1.5 text-left font-medium text-slate-500 dark:text-slate-400">Código</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {preview.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{row.nombre || row.Nombre || "-"}</td>
                                                <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-mono italic">{row.codigo || row.Codigo || row.RNA || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3">
                        <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-blue-700">Importante</p>
                            <p className="text-[10px] text-blue-600 leading-relaxed">
                                El archivo debe contener al menos una columna llamada <b>'nombre'</b>. Opcionalmente puedes incluir <b>'codigo'</b>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button
                            className="w-full bg-accent text-slate-900 dark:text-white hover:bg-accent/90 font-bold gap-2"
                            onClick={handleImport}
                            disabled={!file || importing}
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Importando...
                                </>
                            ) : (
                                "Iniciar Importación"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 text-xs gap-2"
                            onClick={downloadTemplate}
                        >
                            <FileDown className="h-4 w-4" /> Descargar Plantilla
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
