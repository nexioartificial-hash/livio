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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Upload, FileText, Download, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Loader2, X, Calendar } from "lucide-react";
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
    { value: "full_name", label: "Nombre" },
    { value: "last_name", label: "Apellido" },
    { value: "dni", label: "DNI" },
    { value: "phone", label: "Teléfono" },
    { value: "email", label: "Email" },
    { value: "obra_social", label: "Obra Social" },
    { value: "birth_date", label: "Fecha Nacimiento" },
    { value: "tags", label: "Tags" },
    { value: "gender", label: "Género" },
].sort((a, b) => a.label.localeCompare(b.label));

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[-_]/g, ' ');

const TruncatedCell = ({ value }: { value: any }) => {
    const strValue = String(value || "");
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(strValue);
    const displayValue = isDate ? strValue.split('-').reverse().join('/') : strValue;

    if (strValue.length <= 20) return <span className="text-xs">{displayValue}</span>;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="text-xs cursor-help underline decoration-dotted decoration-slate-300">
                        {displayValue.substring(0, 17)}...
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs break-all">{displayValue}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

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

    // Get combined display name for a row based on current mapping
    const getDisplayName = (row: any) => {
        const nameHeader = Object.keys(mapping).find(k => mapping[k] === 'full_name');
        const surnameHeader = Object.keys(mapping).find(k => mapping[k] === 'last_name');

        let name = nameHeader ? String(row[nameHeader] || "") : "";
        let surname = surnameHeader ? String(row[surnameHeader] || "") : "";

        // Smart split if only name is mapped and contains a space
        if (name && !surname) {
            const parts = name.trim().split(/\s+/);
            if (parts.length > 1) {
                surname = parts.pop() || "";
                name = parts.join(" ");
            }
        }

        return `${name} ${surname}`.trim() || "-";
    };

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
        const extension = file.name.split(".").pop()?.toLowerCase();

        if (extension === "csv") {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => normalizeHeader(header),
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
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Get all rows to normalize headers
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                if (rows.length > 0) {
                    const originalHeaders = rows[0].map(h => String(h || ""));
                    const normalizedHeaders = originalHeaders.map(h => normalizeHeader(h));

                    // Re-parse with normalized headers
                    const json = XLSX.utils.sheet_to_json(sheet) as any[];
                    const normalizedJson = json.map(row => {
                        const newRow: any = {};
                        Object.entries(row).forEach(([key, val]) => {
                            newRow[normalizeHeader(key)] = val;
                        });
                        return newRow;
                    });

                    if (normalizedJson.length > 0) {
                        setRawData(normalizedJson);
                        setHeaders(normalizedHeaders);
                        autoMap(normalizedHeaders);
                    }
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    const autoMap = (fileHeaders: string[]) => {
        const newMapping: Record<string, string> = {};

        fileHeaders.forEach(header => {
            const h = header.toLowerCase().trim();
            if (h === "nombre" || h === "name" || h === "full name" || h === "first name") newMapping[header] = "full_name";
            else if (h === "apellido" || h === "last name" || h === "surname") newMapping[header] = "last_name";
            else if (h === "dni" || h === "documento" || h === "id") newMapping[header] = "dni";
            else if (h === "telefono" || h === "phone" || h === "celular") newMapping[header] = "phone";
            else if (h === "email" || h === "correo") newMapping[header] = "email";
            else if (h.includes("obra") || h.includes("social")) newMapping[header] = "obra_social";
            else if (h.includes("nacimiento") || h.includes("birth") || h === "fecha") newMapping[header] = "birth_date";
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
            const { data: profData, error: profError } = await supabase
                .from('professional')
                .select('clinic_id')
                .eq('id', user.id)
                .maybeSingle();

            if (profError) {
                console.error("Error fetching professional data:", profError);
                throw new Error("No se pudo obtener la información de la clínica: " + profError.message);
            }

            const clinicId = profData?.clinic_id;
            if (!clinicId) {
                throw new Error("No se encontró una clínica asociada a tu usuario.");
            }

            // Transform data
            const patientsToUpsert = rawData.map(row => {
                const patient: any = { clinic_id: clinicId };
                Object.entries(mapping).forEach(([fileHeader, dbField]) => {
                    let value = row[fileHeader];
                    if (dbField === 'tags' && typeof value === 'string') {
                        value = value.split(',').map(t => t.trim()).filter(Boolean);
                    }
                    if (dbField === 'dni') value = String(value || "").replace(/[^0-9]/g, '');
                    patient[dbField] = value;
                });

                // Smart split logic: if last_name is empty but full_name has spaces
                if (patient.full_name && !patient.last_name) {
                    const parts = String(patient.full_name).trim().split(/\s+/);
                    if (parts.length > 1) {
                        patient.last_name = parts.pop();
                        patient.full_name = parts.join(" ");
                    }
                }

                // Ensure required full_name is at least a string
                if (!patient.full_name) patient.full_name = "Sin nombre";

                return patient;
            });

            // Batch in chunks of 100
            const chunkSize = 100;
            const total = patientsToUpsert.length;
            let processed = 0;

            for (let i = 0; i < total; i += chunkSize) {
                const chunk = patientsToUpsert.slice(i, i + chunkSize);

                const { error: upsertError } = await supabase.from('patient').upsert(chunk, {
                    onConflict: 'dni',
                    ignoreDuplicates: !overwrite
                });

                if (upsertError) {
                    console.error("Upsert error details:", upsertError);
                    throw upsertError;
                }

                processed += chunk.length;
                setProgress(Math.round((processed / total) * 100));
            }

            toast.success(`Importación finalizada: ${total} pacientes procesados`);
            onSuccess?.();
            onOpenChange(false);
            resetModal();
        } catch (error: any) {
            console.error("Import error full object:", error);
            const msg = error.message || error.details || "Error desconocido";
            toast.error("Error durante la importación: " + msg);
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
            <DialogContent className="sm:max-w-[850px] h-[90vh] flex flex-col p-6 overflow-hidden">
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
                        {step === 2 && "Verificá la vista previa y mapeá las columnas de tu archivo a los campos de Livio."}
                        {step === 3 && "Revisá el resumen final antes de realizar la importación."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden my-6 border rounded-xl p-4 bg-slate-50/50 flex flex-col">
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
                        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                    <Calendar className="h-4 w-4" /> Vista previa (primeros 10)
                                </h4>
                                <Badge variant="outline" className="text-[10px] bg-white">{rawData.length} filas totales</Badge>
                            </div>

                            <div className="rounded-lg border bg-white shadow-sm overflow-hidden flex flex-col h-[480px]">
                                <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-200">
                                    <Table className="min-w-[1500px] border-separate border-spacing-0">
                                        <TableHeader className="sticky top-0 bg-white z-40 shadow-sm">
                                            <TableRow className="bg-slate-50">
                                                <TableHead className="min-w-[160px] max-w-[220px] py-3 px-3 bg-slate-100/95 sticky left-0 top-0 z-50 border-r border-b backdrop-blur-md">
                                                    <span className="text-[11px] font-black uppercase text-slate-600">Representación Final</span>
                                                </TableHead>
                                                {headers.map((header) => (
                                                    <TableHead key={header} className="min-w-[150px] max-w-[200px] py-2 px-3 border-b bg-slate-50/95 sticky top-0 z-40">
                                                        <div className="space-y-2">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="text-[11px] font-bold block truncate uppercase text-slate-500">
                                                                            {header}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs">{header}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <Select
                                                                value={mapping[header] || "ignore"}
                                                                onValueChange={(val) => setMapping({ ...mapping, [header]: val === "ignore" ? "" : val })}
                                                            >
                                                                <SelectTrigger className="h-8 text-[11px] bg-white border-slate-200 shadow-sm">
                                                                    <SelectValue placeholder="Ignorar" />
                                                                </SelectTrigger>
                                                                <SelectContent className="z-[100]">
                                                                    <SelectItem value="ignore" className="text-[11px] italic text-slate-400">Ignorar</SelectItem>
                                                                    {DB_FIELDS.map(f => (
                                                                        <SelectItem key={f.value} value={f.value} className="text-[11px]">
                                                                            {f.label} {f.value === 'dni' || f.value === 'full_name' ? <span className="text-red-500 font-bold">*</span> : ""}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y relative">
                                            {rawData.slice(0, 20).map((row, i) => (
                                                <TableRow key={i} className="hover:bg-slate-50/50 group transition-colors">
                                                    <TableCell className="py-2.5 px-3 bg-slate-50/95 sticky left-0 z-30 border-r border-b backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                        <span className="text-xs font-bold text-slate-800">{getDisplayName(row)}</span>
                                                    </TableCell>
                                                    {headers.map((h) => (
                                                        <TableCell key={h} className="py-2.5 px-3 border-b border-r last:border-r-0">
                                                            <TruncatedCell value={row[h]} />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-end">
                                <div className="flex items-center space-x-2 bg-[#76D7B6]/5 border border-[#76D7B6]/20 p-4 rounded-xl">
                                    <Checkbox id="overwrite" checked={overwrite} onCheckedChange={(val) => setOverwrite(!!val)} />
                                    <div>
                                        <label htmlFor="overwrite" className="text-sm font-bold text-slate-700 block cursor-pointer">
                                            Sobrescribir datos existentes
                                        </label>
                                        <p className="text-xs text-slate-500">Si el DNI ya existe, se actualizará el paciente en lugar de crear uno nuevo.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 flex flex-col items-center justify-center py-8 text-center flex-1">
                            <div className="w-24 h-24 rounded-full bg-[#76D7B6]/10 flex items-center justify-center mb-4 scale-animation">
                                <CheckCircle2 className="h-12 w-12 text-[#76D7B6]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">¿Todo listo para importar?</h3>
                                <div className="mt-4 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                    <div className="p-3 bg-white border rounded-xl shadow-sm">
                                        <p className="text-2xl font-black text-[#76D7B6]">{rawData.length}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Pacientes</p>
                                    </div>
                                    <div className="p-3 bg-white border rounded-xl shadow-sm">
                                        <p className="text-2xl font-black text-[#76D7B6]">{Object.keys(mapping).filter(k => mapping[k]).length}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Campos</p>
                                    </div>
                                </div>
                                <p className="text-slate-500 max-w-sm mx-auto mt-6 text-sm">
                                    Los campos faltantes se podrán completar manualmente desde el perfil del paciente.
                                </p>
                            </div>

                            {isProcessing && (
                                <div className="w-full max-w-sm space-y-3 mt-8">
                                    <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-tighter">
                                        <span>Procesando lote...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-3 rounded-full bg-slate-100" />
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
