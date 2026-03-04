"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, ArrowRight, History, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";

export default function HistoriaClinicaIndex() {
    const { user } = useAuth();
    const supabase = createClient();
    const [search, setSearch] = useState("");
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.clinic_id) return;

        const fetchPatients = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('patient')
                    .select('id, full_name, dni, email, created_at')
                    .eq('clinic_id', user.clinic_id)
                    .order('full_name');

                if (error) throw error;
                setPatients(data || []);
            } catch (error) {
                console.error("Error fetching patients:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, [user?.clinic_id, supabase]);

    const filteredPatients = patients.filter(p =>
        (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.dni || "").includes(search)
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Historias Clínicas</h1>
                <p className="text-slate-500">Busca un paciente para ver su ficha dental completa y odontograma.</p>
            </div>

            <Card className="border-slate-100 shadow-sm overflow-hidden bg-[#76D7B6]/5 border-dashed border-2 border-[#76D7B6]/20">
                <CardContent className="p-8">
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                            placeholder="Buscar por nombre, DNI o ID de paciente..."
                            className="pl-10 h-12 text-lg bg-white border-slate-200 focus:border-[#76D7B6] focus:ring-[#76D7B6]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#76D7B6]" /></div>
                ) : filteredPatients.length > 0 ? (
                    filteredPatients.map(patient => (
                        <Link key={patient.id} href={`/historia-clinica/${patient.id}`}>
                            <Card className="hover:border-[#76D7B6] hover:shadow-md transition-all cursor-pointer group">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border border-slate-100">
                                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                                                {(patient.full_name || "?").split(" ").map((n: string) => n[0]).join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-[#76D7B6] transition-colors">{patient.full_name}</h3>
                                            <p className="text-xs text-slate-500">DNI: {patient.dni || "S/D"} · {patient.email || "Sin email"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Registrado el</p>
                                            <p className="text-xs font-medium text-slate-700">
                                                {patient.created_at ? new Date(patient.created_at).toLocaleDateString('es-AR') : "-"}
                                            </p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#76D7B6] group-hover:text-white transition-all">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                        <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-sm">No se encontraron pacientes que coincidan con la búsqueda.</p>
                        <Link href="/pacientes">
                            <Button variant="link" className="text-[#76D7B6] text-xs mt-2">Crear nuevo paciente</Button>
                        </Link>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Card className="bg-white border-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <History className="h-4 w-4 text-[#76D7B6]" />
                            Historias Recientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-xs text-slate-400">Verás las fichas de los pacientes registrados para tu clínica.</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-[#76D7B6]" />
                            Pacientes Nuevos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/pacientes">
                            <Button variant="outline" className="w-full text-xs gap-2">Ir a gestión de pacientes</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
