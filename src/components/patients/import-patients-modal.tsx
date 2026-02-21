"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Download, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";

type Step = 1 | 2 | 3;

interface ImportPatientsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const TEMPLATE_HEADERS = [
    "nombre", "apellido", "dni", "telefono", "email",
    "obrasocial", "plan", "numeroafiliado", "fechanacimiento", "tags"
];

const DB_FIELDS = [
    { value: "full_name", label: "Nombre Completo" },
    { value: "dni", label: "DNI" },
    { value: "phone", label: "Teléfono" },
    { value: "email", label: "Email" },
    { value: "obra_social", label: "Obra Social" },
    { value: "birth_date", label: "Fecha Nacimiento" },
    { value: "tags", label: "Tags" },
    { value: "gender", label: "Género" },
];

export function ImportPatientsModal({ open, onOpenChange, onSuccess }: ImportPatientsModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>(1);
    const [file, setFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [overwrite, setOverwrite] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // --- Step 1: Upload & Parse ---
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) return;

        if (selectedFile.size > 5 * 1024 * 1024) {
            toast.error("El archivo supera los 5MB permitidos");
            return;
        }

        setFile(selectedFile);
        parseFile(selectedFile);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        },
        multiple: false,
    });

    const parseFile = (file: File) => {
        const reader = new FileReader();
        const extension = file.name.split(".").pop()?.toLowerCase();

        if (extension === "csv") {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const data = results.data as any[];
                    if (data && data.length > 0) {
                        setRawData(data);
                        const firstRowHeaders = Object.keys(data[0] as object);
                        setHeaders(firstRowHeaders);
                        autoMap(firstRowHeaders);
                    }
                },
            });
        } else if (extension === "xlsx") {
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet) as any[];
                if (json.length > 0) {
                    setRawData(json);
                    const firstRowHeaders = Object.keys(json[0] as object);
                    setHeaders(firstRowHeaders);
                    autoMap(firstRowHeaders);
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    const autoMap = (fileHeaders: string[]) => {
        const newMapping: Record<string, string> = {};
        const dbValues = DB_FIELDS.map(f => f.value);

        fileHeaders.forEach(header => {
            const h = header.toLowerCase().trim();
            if (h === "nombre" || h === "name" || h === "nombre completo") newMapping[header] = "full_name";
            else if (h === "dni" || h === "documento") newMapping[header] = "dni";
            else if (h === "telefono" || h === "phone" || h === "celular") newMapping[header] = "phone";
            else if (h === "email" || h === "correo") newMapping[header] = "email";
            else if (h.includes("obra") || h.includes("social")) newMapping[header] = "obra_social";
            else if (h.includes("nacimiento") || h.includes("birth")) newMapping[header] = "birth_date";
            else if (h === "tags" || h === "etiquetas") newMapping[header] = "tags";
            else if (h === "genero" || h === "sexo" || h === "gender") newMapping[header] = "gender";
        });
        setMapping(newMapping);
    };

    const downloadTemplate = () => {
        const csvContent = TEMPLATE_HEADERS.join(",") + "\n";
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_pacientes.csv");
        link.click();
    };

    // --- Step 3: Execution ---
    const handleImport = async () => {
        if (!user || rawData.length === 0) return;

        // Check required mappings
        const mappedFields = Object.values(mapping);
        if (!mappedFields.includes("full_name") || !mappedFields.includes("dni")) {
            toast.error("Debes mapear al menos los campos Nombre y DNI");
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        try {
            // Get clinic_id for the current user
            const { data: profData } = await supabase
                .from('professional')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            const clinicId = profData?.clinic_id;

            // Transform data
            const patientsToUpsert = rawData.map(row => {
                const patient: any = { clinic_id: clinicId };
                Object.entries(mapping).forEach(([fileHeader, dbField]) => {
                    let value = row[fileHeader];
                    if (dbField === 'tags' && typeof value === 'string') {
                        value = value.split(',').map(t => t.trim()).filter(Boolean);
                    }
                    if (dbField === 'dni') value = String(value).replace(/[^0-9]/g, '');
                    patient[dbField] = value;
                });
                return patient;
            });

            // Batch in chunks of 100
            const chunkSize = 100;
            const total = patientsToUpsert.length;
            let processed = 0;

            for (let i = 0; i < total; i += chunkSize) {
                const chunk = patientsToUpsert.slice(i, i + chunkSize);

                let query = supabase.from('patient').upsert(chunk, {
                    onConflict: 'dni',
                    ignoreDuplicates: !overwrite
                });

                const { error } = await query;
                if (error) throw error;

                processed += chunk.length;
                setProgress(Math.round((processed / total) * 100));
            }

            toast.success(`Importación finalizada: ${total} pacientes procesados`);
            onSuccess?.();
            onOpenChange(false);
            resetModal();
        } catch (error: any) {
            console.error("Import error:", error);
            toast.error("Error durante la importación: " + (error.message || "Error desconocido"));
        } finally {
            setIsProcessing(false);
        }
    };

    const resetModal = () => {
        setStep(1);
        setFile(null);
        setRawData([]);
        setHeaders([]);
        setMapping({});
        setProgress(0);
        setIsProcessing(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!isProcessing) {
                onOpenChange(val);
                if (!val) resetModal();
            }
        }}>
            <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-2">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Upload className="h-6 w-6 text-[#76D7B6]" />
                            Importar Pacientes
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3].map(s => (
                                <div
                                    key={s}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? "bg-[#76D7B6] text-slate-900" :
                                        step > s ? "bg-[#76D7B6]/20 text-[#76D7B6]" : "bg-slate-100 text-slate-400"
                                        }`}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogDescription>
                        {step === 1 && "Subí tu archivo CSV o Excel para cargar pacientes masivamente."}
                        {step === 2 && "Configurá qué columna de tu archivo corresponde a cada dato en Livio."}
                        {step === 3 && "Revisá el resumen final antes de realizar la importación."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto my-6 border rounded-xl p-4 bg-slate-50/50">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${isDragActive ? "border-[#76D7B6] bg-[#76D7B6]/5" : "border-slate-200 hover:border-[#76D7B6]/50 bg-white"
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Upload className={`h-8 w-8 ${isDragActive ? "text-[#76D7B6]" : "text-slate-400"}`} />
                                    </div>
                                    {file ? (
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · {rawData.length} filas detectadas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-900">
                                                {isDragActive ? "Soltá el archivo acá" : "Hacé clic o arrastrá tu archivo"}
                                            </p>
                                            <p className="text-xs text-slate-400">Archivos .csv o .xlsx soportados (Max 5MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white border rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">¿No tenés un formato?</p>
                                        <p className="text-xs text-slate-400">Usá nuestra plantilla para evitar errores.</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
                                    <Download className="h-4 w-4" /> Plantilla.csv
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="rounded-lg border bg-white overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="text-xs">Columna Archivo</TableHead>
                                            <TableHead className="w-12 text-center"><ChevronRight className="h-3 w-3 mx-auto text-slate-300" /></TableHead>
                                            <TableHead className="text-xs">Campo Livio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {headers.map((header) => (
                                            <TableRow key={header}>
                                                <TableCell className="font-medium text-sm py-3 capitalize">{header}</TableCell>
                                                <TableCell className="text-center">
                                                    {mapping[header] ? (
                                                        <CheckCircle2 className="h-4 w-4 mx-auto text-[#76D7B6]" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 mx-auto text-slate-200" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={mapping[header] || "ignore"}
                                                        onValueChange={(val) => setMapping({ ...mapping, [header]: val === "ignore" ? "" : val })}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs">
                                                            <SelectValue placeholder="Ignorar columna" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ignore" className="text-xs italic text-slate-400">Ignorar columna</SelectItem>
                                                            {DB_FIELDS.map(f => (
                                                                <SelectItem key={f.value} value={f.value} className="text-xs">
                                                                    {f.label} {f.value === 'dni' || f.value === 'full_name' ? <span className="text-red-500 font-bold">*</span> : ""}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center space-x-2 bg-[#76D7B6]/5 border border-[#76D7B6]/20 p-4 rounded-lg">
                                <Checkbox id="overwrite" checked={overwrite} onCheckedChange={(val) => setOverwrite(!!val)} />
                                <label htmlFor="overwrite" className="text-sm font-medium text-slate-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Sobrescribir datos si el DNI ya existe en la clínica
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-24 h-24 rounded-full bg-[#76D7B6]/10 flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-12 w-12 text-[#76D7B6]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">¿Todo listo para importar?</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                    Se importarán <strong>{rawData.length}</strong> pacientes.
                                    Los campos faltantes se podrán editar manualmente en la ficha de cada paciente.
                                </p>
                            </div>

                            {isProcessing && (
                                <div className="w-full max-w-sm space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>Procesando...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(step === 2 ? 1 : 2)}
                        disabled={step === 1 || isProcessing}
                        className={step === 1 ? "hidden" : ""}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" /> Volver
                    </Button>

                    <div className="flex-1" />

                    {step < 3 ? (
                        <Button
                            className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold"
                            disabled={!file}
                            onClick={() => setStep(step === 1 ? 2 : 3)}
                        >
                            Siguiente <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold min-w-[140px]"
                            onClick={handleImport}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importando...</>
                            ) : (
                                "Iniciar Importación"
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
