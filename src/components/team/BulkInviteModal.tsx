"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    Upload, 
    FileText, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    Send,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { inviteTeamMember } from "@/app/actions/team";
import { Badge } from "@/components/ui/badge";

interface BulkInviteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function BulkInviteModal({ open, onOpenChange, onSuccess }: BulkInviteModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState(0);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile) {
            setFile(selectedFile);
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setParsedData(results.data);
                    toast.success(`${results.data.length} filas detectadas`);
                },
                error: (error) => {
                    toast.error("Error al procesar el archivo CSV");
                    console.error(error);
                }
            });
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
        },
        multiple: false
    });

    const handleInvite = async () => {
        if (parsedData.length === 0) return;
        setSending(true);
        setProgress(0);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
            const email = row.email || row.Email || row.EMAIL;
            const role = row.role || row.Role || row.ROL || "profesional";
            const name = row.nombre || row.Nombre || row.NAME || "";

            if (!email) {
                errorCount++;
                continue;
            }

            try {
                const res = await inviteTeamMember(
                    email,
                    name || email.split('@')[0],
                    role.toLowerCase().includes("recep") ? "receptionist" : "professional"
                );
                if (res.success) successCount++;
                else errorCount++;
            } catch (err) {
                errorCount++;
            }
            setProgress(Math.round(((i + 1) / parsedData.length) * 100));
        }

        setSending(false);
        if (successCount > 0) {
            toast.success(`${successCount} invitaciones enviadas correctamente`);
            onSuccess();
            if (errorCount === 0) onOpenChange(false);
        }
        if (errorCount > 0) {
            toast.error(`${errorCount} invitaciones fallaron. Verifica el formato.`);
        }
        setFile(null);
        setParsedData([]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <div className="bg-slate-900 p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <Send className="h-6 w-6 text-[#76D7B6]" />
                            Invitación Masiva
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-400 text-sm mt-2">
                        Sube un archivo CSV con columnas: <span className="text-white font-mono">email, nombre, rol</span>
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {!file ? (
                        <div 
                            {...getRootProps()} 
                            className={`
                                border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all
                                ${isDragActive ? "border-[#76D7B6] bg-[#76D7B6]/5" : "border-slate-200 hover:border-slate-300 bg-slate-50"}
                            `}
                        >
                            <input {...getInputProps()} />
                            <div className="h-16 w-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                                <Upload className="h-8 w-8 text-[#76D7B6]" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-slate-700">Arrastra tu archivo CSV aquí</p>
                                <p className="text-xs text-slate-400 mt-1">O haz clic para seleccionar manualmente</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-white rounded-xl shadow-xs flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-[#76D7B6]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-700 truncate max-w-[200px]">{file.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{parsedData.length} contactos encontrados</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-full"
                                    onClick={() => { setFile(null); setParsedData([]); }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {sending && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                        <span>Procesando...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2 bg-slate-100 [&>div]:bg-[#76D7B6] rounded-full" />
                                </div>
                            )}

                            <div className="max-h-[200px] overflow-y-auto rounded-xl border border-slate-100">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase sticky top-0">
                                        <tr>
                                            <th className="p-2 pl-4">Email</th>
                                            <th className="p-2">Rol ESP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {parsedData.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                <td className="p-2 pl-4 text-slate-600 truncate">{row.email || row.Email}</td>
                                                <td className="p-2 text-slate-400 italic">{row.role || row.Role || "profesional"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 5 && (
                                    <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50/50">
                                        y {parsedData.length - 5} más...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <AlertCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Importante</p>
                            <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">
                                Asegúrate de que el CSV use comas (,) como separador. Los roles válidos son "profesional" o "recepcionista".
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-0 gap-2">
                    <Button 
                        variant="ghost" 
                        className="rounded-xl"
                        onClick={() => { setFile(null); setParsedData([]); onOpenChange(false); }}
                        disabled={sending}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleInvite}
                        disabled={!file || sending}
                        className="bg-[#76D7B6] hover:bg-[#65c5a4] text-white rounded-xl gap-2 min-w-[150px] shadow-lg shadow-[#76D7B6]/20"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar Invitaciones
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
