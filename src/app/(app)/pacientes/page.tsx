"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, FileText, Calendar, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface Patient {
    id: string;
    name: string;
    dni: string;
    phone: string;
    obraSocial: string;
    tags: string[];
    nextAppointment: string | null;
    email: string;
}

const mockPatients: Patient[] = [
    { id: "1", name: "Sofia Martinez", dni: "38.456.789", phone: "+54 11 5678-1234", obraSocial: "OSDE", tags: ["Ortodoncia"], nextAppointment: "2026-02-20 10:30", email: "sofia@email.com" },
    { id: "2", name: "Carlos Ruiz", dni: "35.123.456", phone: "+54 11 4567-8901", obraSocial: "Swiss Medical", tags: ["Implantes", "Prótesis"], nextAppointment: "2026-02-22 14:00", email: "carlos@email.com" },
    { id: "3", name: "Ana García", dni: "40.789.012", phone: "+54 11 3456-7890", obraSocial: "OSDE", tags: ["Limpieza"], nextAppointment: null, email: "ana@email.com" },
    { id: "4", name: "Pedro López", dni: "33.654.321", phone: "+54 11 2345-6789", obraSocial: "Galeno", tags: ["Endodoncia"], nextAppointment: "2026-02-19 09:00", email: "pedro@email.com" },
    { id: "5", name: "Lucía Fernández", dni: "42.987.654", phone: "+54 11 1234-5678", obraSocial: "Medifé", tags: ["Estética", "Blanqueamiento"], nextAppointment: "2026-02-25 16:00", email: "lucia@email.com" },
    { id: "6", name: "Juan Martínez", dni: "36.321.987", phone: "+54 11 9876-5432", obraSocial: "OSDE", tags: ["Control"], nextAppointment: "2026-03-01 11:00", email: "juan@email.com" },
    { id: "7", name: "María Torres", dni: "39.654.123", phone: "+54 11 8765-4321", obraSocial: "Swiss Medical", tags: ["Ortodoncia", "Limpieza"], nextAppointment: null, email: "maria@email.com" },
    { id: "8", name: "Diego Sánchez", dni: "41.147.258", phone: "+54 11 7654-3210", obraSocial: "Galeno", tags: ["Cirugía"], nextAppointment: "2026-02-28 08:30", email: "diego@email.com" },
];

type SortField = "name" | "dni" | "obraSocial" | "nextAppointment";
type SortDir = "asc" | "desc";

export default function PacientesPage() {
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(1);
    const perPage = 6;

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        let result = mockPatients.filter(p =>
            p.name.toLowerCase().includes(q) || p.dni.includes(q)
        );
        result.sort((a, b) => {
            const aVal = a[sortField] ?? "";
            const bVal = b[sortField] ?? "";
            return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        });
        return result;
    }, [search, sortField, sortDir]);

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(prev => prev === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
                <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold gap-2" onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-4 w-4" /> Nuevo Paciente
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nombre o DNI..."
                    className="pl-10"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[260px]">
                                    <button className="flex items-center gap-1 text-xs" onClick={() => toggleSort("name")}>
                                        Paciente <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button className="flex items-center gap-1 text-xs" onClick={() => toggleSort("dni")}>
                                        DNI <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>
                                    <button className="flex items-center gap-1 text-xs" onClick={() => toggleSort("obraSocial")}>
                                        Obra Social <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead>
                                    <button className="flex items-center gap-1 text-xs" onClick={() => toggleSort("nextAppointment")}>
                                        Próximo Turno <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.map(patient => (
                                <TableRow key={patient.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] text-xs font-bold">
                                                    {patient.name.split(" ").map(n => n[0]).join("")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">{patient.name}</p>
                                                <p className="text-xs text-slate-400">{patient.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">{patient.dni}</TableCell>
                                    <TableCell className="text-sm text-slate-600">{patient.phone}</TableCell>
                                    <TableCell><Badge variant="secondary" className="text-xs">{patient.obraSocial}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {patient.tags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-[10px] border-[#76D7B6]/30 text-[#76D7B6]">{tag}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {patient.nextAppointment ? (
                                            <div className="flex items-center gap-1 text-xs text-slate-600">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(patient.nextAppointment).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Sin turno</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/historia-clinica/${patient.id}`}>
                                            <Button variant="ghost" size="sm" className="gap-1 text-xs text-[#76D7B6] hover:text-[#65cba8]">
                                                <FileText className="h-3.5 w-3.5" /> Historia
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginated.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                                        No se encontraron pacientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{filtered.length} pacientes encontrados</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600">Pág. {page}/{totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* New Patient Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Nuevo Paciente</DialogTitle>
                        <DialogDescription>Completá los datos del paciente para registrarlo.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Nombre</Label>
                            <Input className="col-span-3" placeholder="Nombre completo" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">DNI</Label>
                            <Input className="col-span-3" placeholder="XX.XXX.XXX" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Teléfono</Label>
                            <Input className="col-span-3" placeholder="+54 11 XXXX-XXXX" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Email</Label>
                            <Input className="col-span-3" type="email" placeholder="paciente@email.com" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Obra Social</Label>
                            <Input className="col-span-3" placeholder="Ej: OSDE, Swiss Medical..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold" onClick={() => setIsModalOpen(false)}>
                            Registrar Paciente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
