"use client";

import { useState } from "react";
import { Search, UserPlus, ArrowRight, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

const mockPatients = [
    { id: 1, name: "Juan Diaz", dni: "35.789.012", email: "juan.diaz@email.com", lastVisit: "10 Feb 2026" },
    { id: 2, name: "Sofia Martinez", dni: "38.456.789", email: "sofia@email.com", lastVisit: "15 Jan 2026" },
    { id: 3, name: "Ricardo Gomez", dni: "32.123.456", email: "ricardo@email.com", lastVisit: "05 Dec 2025" },
];

export default function HistoriaClinicaIndex() {
    const [search, setSearch] = useState("");

    const filteredPatients = mockPatients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.dni.includes(search)
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
                {filteredPatients.length > 0 ? (
                    filteredPatients.map(patient => (
                        <Link key={patient.id} href={`/historia-clinica/${patient.id}`}>
                            <Card className="hover:border-[#76D7B6] hover:shadow-md transition-all cursor-pointer group">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border border-slate-100">
                                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                                                {patient.name.split(" ").map(n => n[0]).join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-[#76D7B6] transition-colors">{patient.name}</h3>
                                            <p className="text-xs text-slate-500">DNI: {patient.dni} · {patient.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Última Visita</p>
                                            <p className="text-xs font-medium text-slate-700">{patient.lastVisit}</p>
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
                        <div className="text-xs text-slate-400">Verás las últimas fichas que abriste aquí.</div>
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
