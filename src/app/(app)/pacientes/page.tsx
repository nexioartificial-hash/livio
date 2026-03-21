"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Plus, FileText, Calendar, ArrowUpDown, ChevronLeft, ChevronRight, Upload, Loader2, ChevronsUpDown, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { ImportPatientsModal } from "@/components/patients/import-patients-modal";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { DateTime } from "luxon";

interface Patient {
    id: string;
    name: string;
    lastName: string;
    dni: string;
    phone: string;
    obraSocial: string;
    obraSocialPlan: string;
    tags: string[];
    nextAppointment: string | null;
    email: string;
    birthDate: string;
    gender: string;
}

const mockPatients: Patient[] = [
    { id: "1", name: "Sofia", lastName: "Martinez", dni: "38.456.789", phone: "+54 11 5678-1234", obraSocial: "OSDE", obraSocialPlan: "310", tags: ["Ortodoncia"], nextAppointment: "2026-02-20 10:30", email: "sofia@email.com", birthDate: "1995-03-12", gender: "Femenino" },
    { id: "2", name: "Carlos", lastName: "Ruiz", dni: "35.123.456", phone: "+54 11 4567-8901", obraSocial: "Swiss Medical", obraSocialPlan: "SMG20", tags: ["Implantes", "Prótesis"], nextAppointment: "2026-02-22 14:00", email: "carlos@email.com", birthDate: "1988-07-25", gender: "Masculino" },
    { id: "3", name: "Ana", lastName: "García", dni: "40.789.012", phone: "+54 11 3456-7890", obraSocial: "OSDE", obraSocialPlan: "210", tags: ["Limpieza"], nextAppointment: null, email: "ana@email.com", birthDate: "2000-01-15", gender: "Femenino" },
    { id: "4", name: "Pedro", lastName: "López", dni: "33.654.321", phone: "+54 11 2345-6789", obraSocial: "Galeno", obraSocialPlan: "Oro", tags: ["Endodoncia"], nextAppointment: "2026-02-19 09:00", email: "pedro@email.com", birthDate: "1982-11-03", gender: "Masculino" },
    { id: "5", name: "Lucía", lastName: "Fernández", dni: "42.987.654", phone: "+54 11 1234-5678", obraSocial: "Medifé", obraSocialPlan: "Plata", tags: ["Estética", "Blanqueamiento"], nextAppointment: "2026-02-25 16:00", email: "lucia@email.com", birthDate: "1998-06-20", gender: "Femenino" },
    { id: "6", name: "Juan", lastName: "Martínez", dni: "36.321.987", phone: "+54 11 9876-5432", obraSocial: "OSDE", obraSocialPlan: "410", tags: ["Control"], nextAppointment: "2026-03-01 11:00", email: "juan@email.com", birthDate: "1990-09-08", gender: "Masculino" },
    { id: "7", name: "María", lastName: "Torres", dni: "39.654.123", phone: "+54 11 8765-4321", obraSocial: "Swiss Medical", obraSocialPlan: "SMG40", tags: ["Ortodoncia", "Limpieza"], nextAppointment: null, email: "maria@email.com", birthDate: "1993-04-17", gender: "Femenino" },
    { id: "8", name: "Diego", lastName: "Sánchez", dni: "41.147.258", phone: "+54 11 7654-3210", obraSocial: "Galeno", obraSocialPlan: "Plata", tags: ["Cirugía"], nextAppointment: "2026-02-28 08:30", email: "diego@email.com", birthDate: "1985-12-30", gender: "Masculino" },
];

type SortField = "name" | "dni" | "obraSocial" | "nextAppointment";
type SortDir = "asc" | "desc";

// Generate accent variants for Spanish search (e.g. "sanchez" → ["sanchez","sánchez","sanchéz","sánchéz"])
function getAccentVariants(term: string): string[] {
    const lower = term.toLowerCase();
    // If term already has accents, also search the stripped version
    if (/[áéíóúüñ]/.test(lower)) {
        const stripped = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace('ñ', 'n').normalize('NFC');
        return [...new Set([lower, stripped])];
    }
    const accentMap: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ' };
    const positions = [...lower].map((c, i) => c in accentMap ? i : -1).filter(i => i >= 0);
    const count = Math.min(positions.length, 4); // cap at 4 accent positions = max 16 variants
    const variants = new Set<string>([lower]);
    for (let mask = 1; mask < (1 << count); mask++) {
        const chars = [...lower];
        for (let bit = 0; bit < count; bit++) {
            if (mask & (1 << bit)) chars[positions[bit]] = accentMap[lower[positions[bit]]];
        }
        variants.add(chars.join(''));
    }
    return [...variants];
}

// Title-case helper: capitalize first letter of each word
function toTitleCase(str: string) {
    return str.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Calculate age from ISO date string
function calcAge(birthDate: string): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
}

// Format DNI: keep only digits, insert dots as XX.XXX.XXX
function formatDni(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, digits.length - 3)}.${digits.slice(-3)}`;
    return `${digits.slice(0, digits.length - 6)}.${digits.slice(-6, -3)}.${digits.slice(-3)}`;
}

interface NewPatientForm {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email: string;
    obraSocialId: string;
    obraSocialNombre: string;
    particular: boolean;
    birthDate: string;
    gender: string;
    obraSocialPlan: string;
}

const EMPTY_FORM: NewPatientForm = {
    nombre: "", apellido: "", dni: "", telefono: "+54 ",
    email: "", obraSocialId: "", obraSocialNombre: "", particular: false,
    birthDate: "", gender: "", obraSocialPlan: "",
};

export default function PacientesPage() {
    const { user, loading: authLoading } = useAuth();
    const [search, setSearch] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [form, setForm] = useState<NewPatientForm>(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewPatientForm, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [obrasSociales, setObrasSociales] = useState<{ id: string; nombre: string }[]>([]);
    const [osOpen, setOsOpen] = useState(false);
    const [osSearch, setOsSearch] = useState("");
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editForm, setEditForm] = useState<NewPatientForm>(EMPTY_FORM);
    const [editErrors, setEditErrors] = useState<Partial<Record<keyof NewPatientForm, string>>>({});
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const perPage = 10;

    const fetchPatients = useCallback(async () => {
        if (!user) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            let query = supabase
                .from('patient')
                .select('*', { count: 'exact' });

            if (search) {
                const dniFormatted = formatDni(search.replace(/\D/g, ""));
                const dniTerms = dniFormatted && dniFormatted !== search
                    ? `dni.ilike.%${search}%,dni.ilike.%${dniFormatted}%`
                    : `dni.ilike.%${search}%`;
                const nameVariants = getAccentVariants(search);
                const nameTerms = nameVariants
                    .flatMap(v => [`full_name.ilike.%${v}%`, `last_name.ilike.%${v}%`])
                    .join(',');
                query = query.or(`${nameTerms},${dniTerms}`);
            }

            const { data, count, error } = await query
                .order(sortField === 'name' ? 'full_name' : sortField, { ascending: sortDir === 'asc' })
                .range((page - 1) * perPage, page * perPage - 1);

            if (error) throw error;

            setPatients((data || []).map(p => ({
                id: p.id,
                name: p.full_name,
                lastName: p.last_name || "",
                dni: p.dni || "-",
                phone: p.phone || "-",
                obraSocial: p.obra_social || "-",
                obraSocialPlan: p.obra_social_plan || "",
                tags: p.tags || [],
                nextAppointment: null,
                email: p.email || "-",
                birthDate: p.birth_date || "",
                gender: p.gender || "",
            })));
            setTotalCount(count || 0);
        } catch (error: any) {
            console.error("Error fetching patients:", error);
            toast.error("Error al cargar pacientes");
        } finally {
            setIsLoading(false);
        }
    }, [user, search, sortField, sortDir, page]);

    useEffect(() => {
        if (authLoading) return; // Wait for auth to settle
        fetchPatients();         // handles null user gracefully (setIsLoading(false))
    }, [authLoading, fetchPatients]);

    // Load obras sociales of this clinic
    const clinicId = (user as any)?.clinic_id as string | undefined;
    useEffect(() => {
        if (!clinicId) return;
        supabase.from('clinica_obras_sociales').select('id, nombre').eq('clinic_id', clinicId).eq('activo', true).order('nombre').then(({ data }) => {
            if (data) setObrasSociales(data);
        });
    }, [clinicId]);

    const filteredOS = useMemo(() => {
        if (!osSearch) return obrasSociales.slice(0, 50);
        const q = osSearch.toLowerCase();
        return obrasSociales.filter(o => o.nombre.toLowerCase().includes(q)).slice(0, 50);
    }, [obrasSociales, osSearch]);

    const validateForm = () => {
        const errors: Partial<Record<keyof NewPatientForm, string>> = {};
        if (!form.nombre.trim()) errors.nombre = "Requerido";
        if (!form.apellido.trim()) errors.apellido = "Requerido";
        if (!form.dni.trim()) errors.dni = "Requerido";
        if (!form.telefono.trim() || form.telefono === "+54 ") errors.telefono = "Requerido";
        if (!form.email.trim()) errors.email = "Requerido";
        else if (!form.email.toLowerCase().endsWith(".com")) errors.email = "El email debe terminar en .com";
        if (!form.particular && !form.obraSocialId) errors.obraSocialId = "Seleccioná una obra social o marcá Particular";
        return errors;
    };

    const handleSavePatient = async () => {
        const errors = validateForm();
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
        setIsSaving(true);
        try {
            const clinicId = (user as any)?.clinic_id;
            const { error } = await supabase.from('patient').insert({
                clinic_id: clinicId,
                full_name: form.nombre.trim(),
                last_name: form.apellido.trim(),
                dni: form.dni || null,
                phone: form.telefono === "+54 " ? null : form.telefono.trim(),
                email: form.email.trim() || null,
                obra_social: form.particular ? "Particular" : (form.obraSocialNombre || null),
                obra_social_plan: form.particular ? null : (form.obraSocialPlan.trim() || null),
                birth_date: form.birthDate || null,
                gender: form.gender || null,
                status: "activo",
            });
            if (error) throw error;
            toast.success("Paciente registrado correctamente");
            setIsConfirmModalOpen(false);
            setIsCreateModalOpen(false);
            setForm(EMPTY_FORM);
            setFormErrors({});
            fetchPatients();
        } catch (err: any) {
            setSaveError(err.message || "Error desconocido al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const openDetail = (patient: Patient) => {
        setSelectedPatient(patient);
        setIsEditMode(false);
        setEditForm({
            nombre: patient.name,
            apellido: patient.lastName,
            dni: patient.dni === "-" ? "" : patient.dni,
            telefono: patient.phone === "-" ? "+54 " : patient.phone,
            email: patient.email === "-" ? "" : patient.email,
            obraSocialId: "",
            obraSocialNombre: patient.obraSocial === "-" || patient.obraSocial === "Particular" ? "" : patient.obraSocial,
            particular: patient.obraSocial === "Particular",
            birthDate: patient.birthDate || "",
            gender: patient.gender || "",
            obraSocialPlan: patient.obraSocialPlan || "",
        });
        setEditErrors({});
        setUpdateError(null);
        setIsDetailOpen(true);
    };

    const handleUpdatePatient = async () => {
        const errors: Partial<Record<keyof NewPatientForm, string>> = {};
        if (!editForm.nombre.trim()) errors.nombre = "Requerido";
        if (!editForm.apellido.trim()) errors.apellido = "Requerido";
        if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }
        setIsUpdating(true);
        setUpdateError(null);
        try {
            const { error } = await supabase.from('patient').update({
                full_name: editForm.nombre.trim(),
                last_name: editForm.apellido.trim(),
                dni: editForm.dni || null,
                phone: editForm.telefono === "+54 " ? null : editForm.telefono.trim(),
                email: editForm.email.trim() || null,
                obra_social: editForm.particular ? "Particular" : (editForm.obraSocialNombre || null),
                obra_social_plan: editForm.particular ? null : (editForm.obraSocialPlan.trim() || null),
                birth_date: editForm.birthDate || null,
                gender: editForm.gender || null,
            }).eq('id', selectedPatient!.id);
            if (error) throw error;
            toast.success("Paciente actualizado");
            setIsDetailOpen(false);
            fetchPatients();
        } catch (err: any) {
            setUpdateError(err.message || "Error al actualizar");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeletePatient = async () => {
        if (!selectedPatient) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('patient').delete().eq('id', selectedPatient.id);
            if (error) throw error;
            toast.success("Paciente eliminado");
            setIsDetailOpen(false);
            fetchPatients();
        } catch (err: any) {
            toast.error("Error al eliminar: " + err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const totalPages = Math.ceil(totalCount / perPage);

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(prev => prev === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold text-slate-900">Pacientes</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="h-4 w-4" /> Importar
                    </Button>
                    <Button className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold gap-2" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4" /> Nuevo Paciente
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nombre, apellido o DNI..."
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
                                <TableHead className="w-[260px] text-center">
                                    <button className="flex items-center justify-center gap-1 text-xs font-semibold w-full" onClick={() => toggleSort("name")}>
                                        Paciente <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="text-center">
                                    <button className="flex items-center justify-center gap-1 text-xs font-semibold w-full" onClick={() => toggleSort("dni")}>
                                        DNI <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="text-center text-xs font-semibold">Teléfono</TableHead>
                                <TableHead className="text-center">
                                    <button className="flex items-center justify-center gap-1 text-xs font-semibold w-full" onClick={() => toggleSort("obraSocial")}>
                                        Obra Social <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="text-center">
                                    <button className="flex items-center justify-center gap-1 text-xs font-semibold w-full" onClick={() => toggleSort("nextAppointment")}>
                                        Próximo Turno <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="text-center text-xs font-semibold">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#76D7B6] mb-2" />
                                        <p className="text-sm text-slate-400">Cargando pacientes...</p>
                                    </TableCell>
                                </TableRow>
                            ) : patients.map(patient => (
                                <TableRow key={patient.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <button className="flex items-center gap-3 text-left group" onClick={() => openDetail(patient)}>
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] text-xs font-bold">
                                                    {patient.name[0]}{patient.lastName[0] || ""}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm text-slate-900 group-hover:text-[#76D7B6] transition-colors">{patient.name} {patient.lastName}</p>
                                                <p className="text-xs text-slate-400">{patient.email}</p>
                                            </div>
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600 text-center">{patient.dni}</TableCell>
                                    <TableCell className="text-sm text-slate-600 text-center">{patient.phone}</TableCell>
                                    <TableCell className="text-center"><Badge variant="secondary" className="text-xs">{patient.obraSocial}</Badge></TableCell>
                                    <TableCell className="text-center">
                                        {patient.nextAppointment ? (
                                            <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(patient.nextAppointment).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Sin turno</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Link href={`/historia-clinica/${patient.id}`}>
                                            <Button variant="ghost" size="sm" className="gap-1 text-xs text-[#76D7B6] hover:text-[#65cba8]">
                                                <FileText className="h-3.5 w-3.5" /> Historia
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && patients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-20">
                                        <div className="flex flex-col items-center justify-center gap-4 w-full whitespace-normal">
                                            <div className="w-16 h-16 rounded-full bg-[#76D7B6]/10 flex items-center justify-center">
                                                <Users className="h-8 w-8 text-[#76D7B6]" />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <p className="text-base font-semibold text-slate-800 text-center">
                                                    {search ? "No se encontraron pacientes" : "Todavía no tenés pacientes registrados"}
                                                </p>
                                                <p className="text-sm text-slate-400 mt-1 max-w-xs text-center">
                                                    {search
                                                        ? "Probá con otro nombre, apellido o DNI."
                                                        : "Agregá tu primer paciente para empezar a gestionar turnos e historias clínicas."}
                                                </p>
                                            </div>
                                            {!search && (
                                                <Button
                                                    className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 gap-2 mt-1"
                                                    size="sm"
                                                    onClick={() => setIsCreateModalOpen(true)}
                                                >
                                                    <Plus className="h-4 w-4" /> Agregar primer paciente
                                                </Button>
                                            )}
                                        </div>
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
                    <p className="text-xs text-slate-500">{totalCount} pacientes encontrados</p>
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
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => { setIsCreateModalOpen(open); if (!open) { setForm(EMPTY_FORM); setFormErrors({}); } }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Nuevo Paciente</DialogTitle>
                        <DialogDescription>Completá los datos del paciente para registrarlo.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Nombre */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Nombre</Label>
                            <div className="col-span-3">
                                <Input
                                    placeholder="Nombre"
                                    value={form.nombre}
                                    onChange={e => setForm(f => ({ ...f, nombre: toTitleCase(e.target.value) }))}
                                    className={formErrors.nombre ? "border-red-400" : ""}
                                />
                                {formErrors.nombre && <p className="text-xs text-red-500 mt-1">{formErrors.nombre}</p>}
                            </div>
                        </div>
                        {/* Apellido */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Apellido</Label>
                            <div className="col-span-3">
                                <Input
                                    placeholder="Apellido"
                                    value={form.apellido}
                                    onChange={e => setForm(f => ({ ...f, apellido: toTitleCase(e.target.value) }))}
                                    className={formErrors.apellido ? "border-red-400" : ""}
                                />
                                {formErrors.apellido && <p className="text-xs text-red-500 mt-1">{formErrors.apellido}</p>}
                            </div>
                        </div>
                        {/* DNI */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">DNI</Label>
                            <div className="col-span-3">
                                <Input
                                    placeholder="XX.XXX.XXX"
                                    value={form.dni}
                                    inputMode="numeric"
                                    onChange={e => { setForm(f => ({ ...f, dni: formatDni(e.target.value) })); setFormErrors(fe => ({ ...fe, dni: undefined })); }}
                                    className={formErrors.dni ? "border-red-400" : ""}
                                />
                                {formErrors.dni && <p className="text-xs text-red-500 mt-1">{formErrors.dni}</p>}
                            </div>
                        </div>
                        {/* Teléfono */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Teléfono</Label>
                            <div className="col-span-3">
                                <Input
                                    placeholder="+54 11 XXXX-XXXX"
                                    value={form.telefono}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (!val.startsWith("+54")) return;
                                        setForm(f => ({ ...f, telefono: val }));
                                        setFormErrors(fe => ({ ...fe, telefono: undefined }));
                                    }}
                                    className={formErrors.telefono ? "border-red-400" : ""}
                                />
                                {formErrors.telefono && <p className="text-xs text-red-500 mt-1">{formErrors.telefono}</p>}
                            </div>
                        </div>
                        {/* Email */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Email</Label>
                            <div className="col-span-3">
                                <Input
                                    placeholder="paciente@email.com"
                                    value={form.email}
                                    onChange={e => {
                                        setForm(f => ({ ...f, email: e.target.value.toLowerCase() }));
                                        setFormErrors(fe => ({ ...fe, email: undefined }));
                                    }}
                                />
                                {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                            </div>
                        </div>
                        {/* Obra Social */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Obra Social</Label>
                            <div className="col-span-3 space-y-1">
                            <div className="flex gap-2">
                                <Popover open={osOpen && !form.particular} onOpenChange={v => { if (!form.particular) setOsOpen(v); }}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            disabled={form.particular}
                                            className={cn("flex-1 justify-between font-normal text-sm", !form.obraSocialNombre && "text-slate-400")}
                                        >
                                            <span className="truncate">{form.obraSocialNombre || "Buscar obra social..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-0" align="start">
                                        <Command>
                                            <CommandInput
                                                placeholder="Buscar..."
                                                value={osSearch}
                                                onValueChange={setOsSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty>Sin resultados.</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredOS.map(os => (
                                                        <CommandItem
                                                            key={os.id}
                                                            value={os.nombre}
                                                            onSelect={() => {
                                                                setForm(f => ({ ...f, obraSocialId: os.id, obraSocialNombre: os.nombre, particular: false }));
                                                                setOsOpen(false);
                                                                setOsSearch("");
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4 shrink-0", form.obraSocialId === os.id ? "opacity-100" : "opacity-0")} />
                                                            <span className="text-xs leading-tight">{os.nombre}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    type="button"
                                    variant={form.particular ? "default" : "outline"}
                                    size="sm"
                                    className={cn("shrink-0 text-xs", form.particular && "bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8]")}
                                    onClick={() => setForm(f => ({ ...f, particular: !f.particular, obraSocialId: "", obraSocialNombre: "" }))}
                                >
                                    Particular
                                </Button>
                            </div>
                            {formErrors.obraSocialId && <p className="text-xs text-red-500">{formErrors.obraSocialId}</p>}
                            </div>
                        </div>
                        {/* Plan */}
                        {!form.particular && form.obraSocialNombre && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right text-sm">Plan</Label>
                                <div className="col-span-3">
                                    <Input
                                        placeholder="Ej: 310, SMG Plus..."
                                        value={form.obraSocialPlan}
                                        onChange={e => setForm(f => ({ ...f, obraSocialPlan: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}
                        {/* Fecha Nacimiento */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Nacimiento</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={form.birthDate}
                                    max={new Date().toISOString().split("T")[0]}
                                    onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                                    className="flex-1"
                                />
                                {form.birthDate && calcAge(form.birthDate) !== null && (
                                    <span className="text-sm text-slate-500 shrink-0">{calcAge(form.birthDate)} años</span>
                                )}
                            </div>
                        </div>
                        {/* Género */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-sm">Género</Label>
                            <div className="col-span-3 flex gap-2">
                                {["Masculino", "Femenino", "Otro"].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, gender: f.gender === g ? "" : g }))}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs border transition-colors",
                                            form.gender === g
                                                ? "bg-[#76D7B6] text-slate-900 border-[#76D7B6]"
                                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                                        )}
                                    >{g}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                        <Button
                            className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900"
                            onClick={() => {
                                const errors = validateForm();
                                if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
                                setSaveError(null);
                                setIsConfirmModalOpen(true);
                            }}
                        >
                            Registrar Paciente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Patient Modal */}
            <Dialog open={isConfirmModalOpen} onOpenChange={(v) => { setIsConfirmModalOpen(v); if (!v) setSaveError(null); }}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Confirmar datos del paciente</DialogTitle>
                        <DialogDescription>Revisá que los datos sean correctos antes de registrar.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs text-slate-500">Nombre completo</span>
                                <span className="text-sm font-semibold text-slate-800">{form.nombre} {form.apellido}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs text-slate-500">DNI</span>
                                <span className="text-sm text-slate-800">{form.dni || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs text-slate-500">Teléfono</span>
                                <span className="text-sm text-slate-800">{form.telefono === "+54 " ? "—" : form.telefono}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs text-slate-500">Email</span>
                                <span className="text-sm text-slate-800">{form.email || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs text-slate-500">Obra Social</span>
                                <span className="text-sm text-slate-800">
                                    {form.particular ? "Particular" : (form.obraSocialNombre || "—")}
                                    {!form.particular && form.obraSocialPlan && <span className="text-slate-400 ml-1">· {form.obraSocialPlan}</span>}
                                </span>
                            </div>
                            {form.birthDate && (
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs text-slate-500">Edad</span>
                                    <span className="text-sm text-slate-800">{calcAge(form.birthDate)} años · {new Date(form.birthDate).toLocaleDateString("es-AR")}</span>
                                </div>
                            )}
                            {form.gender && (
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs text-slate-500">Género</span>
                                    <span className="text-sm text-slate-800">{form.gender}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {saveError && (
                        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 -mt-1">
                            Error: {saveError}
                        </p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Editar datos</Button>
                        <Button
                            className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900"
                            onClick={handleSavePatient}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Confirmar y registrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Patient Detail / Edit Modal */}
            <Dialog open={isDetailOpen} onOpenChange={(v) => { setIsDetailOpen(v); if (!v) { setIsEditMode(false); setUpdateError(null); } }}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-bold text-sm">
                                    {selectedPatient?.name[0]}{selectedPatient?.lastName[0] || ""}
                                </AvatarFallback>
                            </Avatar>
                            <span>{selectedPatient?.name} {selectedPatient?.lastName}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {!isEditMode ? (
                        /* ── View mode ── */
                        <div className="py-2 space-y-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs text-slate-500">DNI</span>
                                    <span className="text-sm text-slate-800">{selectedPatient?.dni}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs text-slate-500">Teléfono</span>
                                    <span className="text-sm text-slate-800">{selectedPatient?.phone}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs text-slate-500">Email</span>
                                    <span className="text-sm text-slate-800">{selectedPatient?.email}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs text-slate-500">Obra Social</span>
                                    <span className="text-sm text-slate-800">
                                        {selectedPatient?.obraSocial}
                                        {selectedPatient?.obraSocialPlan && <span className="text-slate-400 ml-1">· {selectedPatient.obraSocialPlan}</span>}
                                    </span>
                                </div>
                                {selectedPatient?.birthDate && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-xs text-slate-500">Edad</span>
                                        <span className="text-sm text-slate-800">
                                            {calcAge(selectedPatient.birthDate)} años
                                            <span className="text-slate-400 ml-1">· {new Date(selectedPatient.birthDate).toLocaleDateString("es-AR")}</span>
                                        </span>
                                    </div>
                                )}
                                {selectedPatient?.gender && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-xs text-slate-500">Género</span>
                                        <span className="text-sm text-slate-800">{selectedPatient.gender}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 text-xs"
                                    onClick={handleDeletePatient}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>🗑</span>}
                                    Eliminar paciente
                                </Button>
                                <div className="flex gap-2">
                                    <Link href={`/historia-clinica/${selectedPatient?.id}`}>
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                            <FileText className="h-3.5 w-3.5" /> Historia
                                        </Button>
                                    </Link>
                                    <Button size="sm" className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 gap-1.5 text-xs" onClick={() => setIsEditMode(true)}>
                                        Editar datos
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Edit mode ── */
                        <div className="py-2 space-y-3">
                            <div className="grid gap-3">
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">Nombre</Label>
                                    <div className="col-span-3">
                                        <Input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: toTitleCase(e.target.value) }))} className={editErrors.nombre ? "border-red-400" : ""} />
                                        {editErrors.nombre && <p className="text-xs text-red-500 mt-1">{editErrors.nombre}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">Apellido</Label>
                                    <div className="col-span-3">
                                        <Input value={editForm.apellido} onChange={e => setEditForm(f => ({ ...f, apellido: toTitleCase(e.target.value) }))} className={editErrors.apellido ? "border-red-400" : ""} />
                                        {editErrors.apellido && <p className="text-xs text-red-500 mt-1">{editErrors.apellido}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">DNI</Label>
                                    <div className="col-span-3">
                                        <Input value={editForm.dni} inputMode="numeric" onChange={e => setEditForm(f => ({ ...f, dni: formatDni(e.target.value) }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">Teléfono</Label>
                                    <div className="col-span-3">
                                        <Input value={editForm.telefono} onChange={e => { if (!e.target.value.startsWith("+54")) return; setEditForm(f => ({ ...f, telefono: e.target.value })); }} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">Email</Label>
                                    <div className="col-span-3">
                                        <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value.toLowerCase() }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">Obra Social</Label>
                                    <div className="col-span-3 flex gap-2">
                                        <Popover open={osOpen && !editForm.particular} onOpenChange={v => { if (!editForm.particular) setOsOpen(v); }}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" disabled={editForm.particular} className={cn("flex-1 justify-between font-normal text-sm", !editForm.obraSocialNombre && "text-slate-400")}>
                                                    <span className="truncate">{editForm.obraSocialNombre || "Buscar obra social..."}</span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[240px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar..." value={osSearch} onValueChange={setOsSearch} />
                                                    <CommandList>
                                                        <CommandEmpty>Sin resultados.</CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredOS.map(os => (
                                                                <CommandItem key={os.id} value={os.nombre} onSelect={() => { setEditForm(f => ({ ...f, obraSocialId: os.id, obraSocialNombre: os.nombre, particular: false })); setOsOpen(false); setOsSearch(""); }}>
                                                                    <Check className={cn("mr-2 h-4 w-4 shrink-0", editForm.obraSocialId === os.id ? "opacity-100" : "opacity-0")} />
                                                                    <span className="text-xs">{os.nombre}</span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <Button type="button" variant={editForm.particular ? "default" : "outline"} size="sm" className={cn("shrink-0 text-xs", editForm.particular && "bg-[#76D7B6] text-slate-900 hover:bg-[#65cba8]")} onClick={() => setEditForm(f => ({ ...f, particular: !f.particular, obraSocialId: "", obraSocialNombre: "" }))}>
                                            Particular
                                        </Button>
                                    </div>
                                </div>
                                {!editForm.particular && editForm.obraSocialNombre && (
                                    <div className="grid grid-cols-4 items-center gap-3">
                                        <Label className="text-right text-xs">Plan</Label>
                                        <div className="col-span-3">
                                            <Input placeholder="Ej: 310, SMG Plus..." value={editForm.obraSocialPlan} onChange={e => setEditForm(f => ({ ...f, obraSocialPlan: e.target.value }))} />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">Nacimiento</Label>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <Input type="date" value={editForm.birthDate} max={new Date().toISOString().split("T")[0]} onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))} className="flex-1" />
                                        {editForm.birthDate && calcAge(editForm.birthDate) !== null && (
                                            <span className="text-sm text-slate-500 shrink-0">{calcAge(editForm.birthDate)} años</span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-3">
                                    <Label className="text-right text-xs">Género</Label>
                                    <div className="col-span-3 flex gap-2">
                                        {["Masculino", "Femenino", "Otro"].map(g => (
                                            <button key={g} type="button" onClick={() => setEditForm(f => ({ ...f, gender: f.gender === g ? "" : g }))}
                                                className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors", editForm.gender === g ? "bg-[#76D7B6] text-slate-900 border-[#76D7B6]" : "border-slate-200 text-slate-500 hover:border-slate-300")}
                                            >{g}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {updateError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{updateError}</p>}
                            <div className="flex justify-end gap-2 pt-1">
                                <Button variant="outline" size="sm" onClick={() => { setIsEditMode(false); setUpdateError(null); }}>Cancelar</Button>
                                <Button size="sm" className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900" onClick={handleUpdatePatient} disabled={isUpdating}>
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    Guardar cambios
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Import Modal */}
            <ImportPatientsModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                onSuccess={fetchPatients}
            />
        </div>
    );
}
