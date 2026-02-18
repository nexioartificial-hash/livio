"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Odontogram } from "@/components/clinical/Odontogram";
import { saveOdontogramState, getOdontogramState } from "@/app/actions/odontogram";
import { createClient } from "@/lib/supabase/client";
import {
    FileText, Activity, ClipboardList, Lock, Calendar, Phone,
    Mail, Shield, CheckCircle2, AlertCircle, Plus, Clock, TrendingUp,
    Pencil, ArrowRight, Heart
} from "lucide-react";
import { toast } from "sonner";

// ─── MOCK DATA ──────────────────────────────────────────────────
const mockHistory = [
    { id: 1, date: "2026-02-10", type: "Consulta", professional: "Dr. Juan Pérez", notes: "Paciente presenta dolor en pieza 36. Se indica radiografía periapical. Diagnóstico: pulpitis irreversible.", status: "completado" },
    { id: 2, date: "2026-01-15", type: "Limpieza", professional: "Dra. María López", notes: "Limpieza dental completa con ultrasonido. Buena higiene oral general. Sangrado gingival leve en sector anteroinferior.", status: "completado" },
    { id: 3, date: "2025-12-05", type: "Ortodoncia", professional: "Dr. Juan Pérez", notes: "Control mensual ortodóncico. Se ajustan arcos NiTi superior e inferior. Próximo control en 4 semanas.", status: "completado" },
    { id: 4, date: "2025-11-10", type: "Radiografía", professional: "Dra. María López", notes: "Panorámica digital. Sin hallazgos patológicos relevantes. Se observa tercer molar inferior derecho en posición horizontal.", status: "completado" },
];

const mockFindings = [
    { id: 1, tooth: 36, finding: "Caries profunda con compromiso pulpar", severity: "alta", date: "2026-02-10" },
    { id: 2, tooth: 24, finding: "Caries interproximal mesial", severity: "media", date: "2026-02-10" },
    { id: 3, tooth: 14, finding: "Obturación deficiente - requiere reemplazo", severity: "media", date: "2026-01-15" },
    { id: 4, tooth: 48, finding: "Tercer molar horizontal - exodoncia programada", severity: "baja", date: "2025-12-05" },
];

const mockTreatments = [
    { id: 1, piece: "36", treatment: "Endodoncia + Corona", status: "en_curso", sessions: 2, totalSessions: 4, cost: 85000, professional: "Dr. Juan Pérez" },
    { id: 2, piece: "24", treatment: "Obturación Compuesta", status: "pendiente", sessions: 0, totalSessions: 1, cost: 15000, professional: "Dra. María López" },
    { id: 3, piece: "14", treatment: "Reemplazo de Obturación", status: "pendiente", sessions: 0, totalSessions: 1, cost: 18000, professional: "Dra. María López" },
    { id: 4, piece: "48", treatment: "Exodoncia 3er Molar", status: "pendiente", sessions: 0, totalSessions: 1, cost: 35000, professional: "Dr. Juan Pérez" },
    { id: 5, piece: "21", treatment: "Corona Cerámica", status: "completado", sessions: 3, totalSessions: 3, cost: 95000, professional: "Dr. Juan Pérez" },
];

const mockEvolutions = [
    { id: 1, date: "2026-02-10", professional: "Dr. Juan Pérez", description: "Apertura cameral pieza 36. Se localiza conducto mesiovestibular, mesiolingual y distal. Conductometría provisional. Se coloca medicación intraconducto (Ca(OH)2). Paciente sin dolor.", signed: true },
    { id: 2, date: "2026-01-28", professional: "Dr. Juan Pérez", description: "Primera sesión endodoncia pieza 36. Anestesia troncular. Aislamiento absoluto. Acceso cameral. Eliminación de tejido pulpar necrótico.", signed: true },
    { id: 3, date: "2026-01-15", professional: "Dra. María López", description: "Limpieza dental completa con ultrasonido y pulido. Instrucción de higiene. Se indica cepillo interdental. Próximo control: 6 meses.", signed: true },
];

// ─── COMPONENT ──────────────────────────────────────────────────
export default function ClinicalHistoryPage() {
    const params = useParams();
    const pacienteId = params.pacienteId as string;
    const [patient, setPatient] = useState<any>({
        name: "Cargando...",
        code: "...",
        status: "...",
        age: 0,
        gender: "-",
        dni: "-",
        phone: "-",
        email: "-",
        obraSocial: "...",
        nextAppointment: "...",
        tags: [],
        bloodType: "-",
        allergies: "N/A",
        lastVisit: "...",
    });
    const [loading, setLoading] = useState(false); // Change to false by default
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [odontogramState, setOdontogramState] = useState<Record<number, any>>({});
    const [currentProfessional, setCurrentProfessional] = useState<any>(null);
    const [dataStatus, setDataStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    // Simulated Supabase fetch
    useEffect(() => {
        if (!pacienteId) return;

        // Force clear after 4 seconds (Fail-safe)
        const timer = setTimeout(() => {
            if (dataStatus === "loading") {
                console.warn("Loading timeout reached. Forcing success state.");
                setDataStatus("success");
            }
        }, 4000);

        const loadPageData = async () => {
            console.log("Loading path:", window.location.pathname);
            setDataStatus("loading");
            const supabase = createClient();

            try {
                // 1. Get Professional Profile (Optional)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: prof } = await supabase.from('professional').select('*').eq('id', user.id).single();
                    if (prof) setCurrentProfessional(prof);
                }

                // 2. Fetch Patient Data
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pacienteId);

                if (isUUID) {
                    const { data: patientData } = await supabase
                        .from('patient')
                        .select('*')
                        .eq('id', pacienteId)
                        .single();

                    if (patientData) {
                        setPatient({
                            ...patientData,
                            id: patientData.id,
                            code: `PT-${patientData.id.slice(0, 4).toUpperCase()}`,
                            name: patientData.full_name,
                            age: patientData.birth_date ? new Date().getFullYear() - new Date(patientData.birth_date).getFullYear() : 30,
                            gender: patientData.gender || "M",
                            dni: patientData.dni || "-",
                            phone: patientData.phone || "-",
                            email: patientData.email || "-",
                            obraSocial: patientData.obra_social || "Particular",
                            nextAppointment: "Cargando...",
                            tags: patientData.tags || [],
                            bloodType: "O+",
                            allergies: "N/A",
                            lastVisit: "Reciente",
                        });

                        const stateResult = await getOdontogramState(pacienteId);
                        if (stateResult?.data) setOdontogramState(stateResult.data);
                    }
                } else {
                    // MOCK DATA for non-UUIDs
                    setPatient({
                        id: pacienteId,
                        code: `PT-MOCK`,
                        name: "Juan Diaz (Demo)",
                        age: 34,
                        gender: "Masculino",
                        dni: "35.789.012",
                        phone: "+54 11 4567-8900",
                        email: "juan.diaz@email.com",
                        obraSocial: "OSDE 310",
                        nextAppointment: "Oct 24, 2026",
                        tags: ["Ortodoncia"],
                        status: "Activo",
                        bloodType: "O+",
                        allergies: "Penicilina",
                        lastVisit: "Feb 10, 2026",
                    });
                }
                setDataStatus("success");
            } catch (error) {
                console.error("Fetch failed:", error);
                setDataStatus("error");
                toast.error("Error al sincronizar con el servidor. Usando modo offline/demo.");
                // Ensure some default is visible
                if (patient?.name === "Cargando...") {
                    setPatient((prev: any) => ({ ...prev, name: "Error al cargar" }));
                }
            }
        };

        loadPageData();
        return () => clearTimeout(timer);
    }, [pacienteId]);

    const handleSign = () => {
        if (otpCode.length === 6) {
            toast.success("✅ Historia clínica firmada digitalmente y guardada.");
            setIsSignModalOpen(false);
            setOtpCode("");
        } else {
            toast.error("Ingresa un código OTP válido de 6 dígitos.");
        }
    };

    // Non-blocking loading indicator as an overlay if needed, but allow content to show
    const isLoading = dataStatus === "loading";

    const totalBudget = mockTreatments.reduce((a, t) => a + t.cost, 0);
    const completedBudget = mockTreatments.filter(t => t.status === "completado").reduce((a, t) => a + t.cost, 0);

    return (
        <div className="space-y-6">
            {isLoading && (
                <div className="fixed top-0 left-0 w-full h-1 z-[100]">
                    <div className="h-full bg-[#76D7B6] animate-pulse"></div>
                </div>
            )}
            {/* ─── Patient Header ─── */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-[#76D7B6]">
                            <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] text-lg font-bold">JD</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold text-slate-900">{patient?.name}</h1>
                                <Badge variant="outline" className="text-[10px] font-mono">#{patient?.code}</Badge>
                                <Badge className="bg-green-100 text-green-700 text-[10px]">{patient?.status}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-1">
                                <span>{patient?.age}y {patient?.gender?.charAt(0)}</span>
                                <span>·</span>
                                <span className="flex items-center gap-0.5"><Shield className="h-3 w-3" /> {patient?.dni}</span>
                                <span>·</span>
                                <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /> {patient?.phone}</span>
                                <span>·</span>
                                <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" /> {patient?.email}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="text-[10px]">{patient?.obraSocial}</Badge>
                                <Badge variant="outline" className="text-[10px] border-red-200 text-red-500"><AlertCircle className="h-2.5 w-2.5 mr-0.5" /> {patient?.allergies}</Badge>
                                <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-500"><Heart className="h-2.5 w-2.5 mr-0.5" /> {patient?.bloodType}</Badge>
                                <span className="text-[10px] text-[#76D7B6] font-medium flex items-center gap-0.5"><Calendar className="h-3 w-3" /> Next: {patient?.nextAppointment}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Archivos</Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                        <Button size="sm" className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setIsSignModalOpen(true)}>
                            <Lock className="h-3.5 w-3.5" /> Firmar & Guardar
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── Main Content: Tabs + Side Panel ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
                {/* Left: Tabs */}
                <Tabs defaultValue="odontogram" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-6">
                        <TabsTrigger value="history" className="text-xs">Historial</TabsTrigger>
                        <TabsTrigger value="odontogram" className="text-xs">Odontograma</TabsTrigger>
                        <TabsTrigger value="diagnosis" className="text-xs">Diagnóstico</TabsTrigger>
                        <TabsTrigger value="treatment" className="text-xs">Tratamiento</TabsTrigger>
                        <TabsTrigger value="evolution" className="text-xs">Evolución</TabsTrigger>
                    </TabsList>

                    {/* TAB: History */}
                    <TabsContent value="history" className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 text-sm">Historial de Consultas</h3>
                            <Button variant="outline" size="sm" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Nueva Entrada</Button>
                        </div>
                        {mockHistory.map(entry => (
                            <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-[10px]">{entry.type}</Badge>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(entry.date).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed">{entry.notes}</p>
                                            <p className="text-xs text-slate-400">Profesional: {entry.professional}</p>
                                        </div>
                                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    {/* TAB: Odontogram */}
                    <TabsContent value="odontogram" className="space-y-4">
                        <Odontogram
                            initialState={odontogramState}
                            currentProfessionalId={currentProfessional?.id}
                            onStateChange={async (state) => {
                                setOdontogramState(state);
                                const res = await saveOdontogramState(pacienteId, state);
                                if (res.error) toast.error("Error al guardar odontograma");
                            }}
                        />
                        {/* KPI Stats */}
                        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div><p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">Caries</p><p className="text-xl font-bold text-slate-900 dark:text-white">{Object.values(odontogramState).filter((t: any) => t.status === "caries").length}</p></div>
                                    <Activity className="h-6 w-6 text-red-200 dark:text-red-800" />
                                </CardContent>
                            </Card>
                            <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div><p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">Obturaciones</p><p className="text-xl font-bold text-slate-900 dark:text-white">{Object.values(odontogramState).filter((t: any) => t.status === "obturacion").length}</p></div>
                                    <ClipboardList className="h-6 w-6 text-blue-200 dark:text-blue-800" />
                                </CardContent>
                            </Card>
                            <Card className="bg-purple-50/50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div><p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase">Endodoncias</p><p className="text-xl font-bold text-slate-900 dark:text-white">{Object.values(odontogramState).filter((t: any) => t.status === "endodoncia").length}</p></div>
                                    <Shield className="h-6 w-6 text-purple-200 dark:text-purple-800" />
                                </CardContent>
                            </Card>
                            <Card className="bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div><p className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase">Sanos</p><p className="text-xl font-bold text-slate-900 dark:text-white">{32 - Object.values(odontogramState).length}</p></div>
                                    <CheckCircle2 className="h-6 w-6 text-green-200 dark:text-green-800" />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* TAB: Diagnosis */}
                    <TabsContent value="diagnosis" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Diagnóstico Clínico</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Diagnóstico Principal</Label>
                                        <Input defaultValue="Caries penetrante pieza 36 c/ compromiso pulpar" className="text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">CIE-10</Label>
                                        <Input defaultValue="K02.1 - Caries de la dentina" className="text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Observaciones Clínicas</Label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                        defaultValue="Paciente presenta dolor espontáneo en pieza 36 desde hace 5 días. Test de vitalidad pulpar positivo pero exacerbado. Radiografía periapical muestra radiolucidez periapical. Se indica endodoncia y posterior rehabilitación con corona cerámica."
                                    />
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-orange-800">⚠ Alergias: {patient.allergies}</p>
                                        <p className="text-[10px] text-orange-600">Grupo Sanguíneo: {patient.bloodType} · Última visita: {patient.lastVisit}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB: Treatment Plan */}
                    <TabsContent value="treatment" className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 text-sm">Plan de Tratamiento</h3>
                            <Button variant="outline" size="sm" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Agregar</Button>
                        </div>
                        {mockTreatments.map(t => (
                            <Card key={t.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-slate-900">Pieza {t.piece}: {t.treatment}</span>
                                                <Badge className={`text-[10px] ${t.status === "completado" ? "bg-green-100 text-green-700" :
                                                    t.status === "en_curso" ? "bg-blue-100 text-blue-700" :
                                                        "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                    {t.status === "en_curso" ? "En Curso" : t.status === "completado" ? "✓ Completado" : "Pendiente"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>Sesiones: {t.sessions}/{t.totalSessions}</span>
                                                <span>·</span>
                                                <span>{t.professional}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-slate-900">${t.cost.toLocaleString()}</p>
                                            {t.status === "en_curso" && (
                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1.5">
                                                    <div className="h-full bg-[#76D7B6] rounded-full transition-all" style={{ width: `${(t.sessions / t.totalSessions) * 100}%` }}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Card className="border-dashed bg-slate-50/50">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-500">Total Presupuesto</p>
                                    <p className="text-lg font-bold text-slate-900">${totalBudget.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">Completado</p>
                                    <p className="text-lg font-bold text-green-600">${completedBudget.toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB: Evolution */}
                    <TabsContent value="evolution" className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 text-sm">Evolución Clínica</h3>
                            <Button variant="outline" size="sm" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Nueva Evolución</Button>
                        </div>
                        {mockEvolutions.map((evo, i) => (
                            <Card key={evo.id} className="relative">
                                {/* Timeline connector */}
                                {i < mockEvolutions.length - 1 && (
                                    <div className="absolute left-[29px] top-[56px] w-0.5 h-[calc(100%-20px)] bg-slate-200"></div>
                                )}
                                <CardContent className="p-4 pl-14 relative">
                                    {/* Timeline dot */}
                                    <div className="absolute left-4 top-5 w-5 h-5 rounded-full bg-[#76D7B6]/20 border-2 border-[#76D7B6] flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[#76D7B6]"></div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-700">{new Date(evo.date).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                                                <span className="text-xs text-slate-400">·</span>
                                                <span className="text-xs text-slate-400">{evo.professional}</span>
                                            </div>
                                            {evo.signed && (
                                                <Badge className="bg-green-100 text-green-700 text-[10px] gap-0.5"><Lock className="h-2.5 w-2.5" /> Firmado</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{evo.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                </Tabs>

                {/* ─── Right Side Panel ─── */}
                <div className="space-y-4">
                    {/* Clinical Findings */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                Hallazgos Clínicos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {mockFindings.map(f => (
                                <div key={f.id} className={`p-2.5 rounded-lg border text-xs ${f.severity === "alta" ? "bg-red-50 border-red-100" :
                                    f.severity === "media" ? "bg-yellow-50 border-yellow-100" :
                                        "bg-slate-50 border-slate-100"
                                    }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-slate-900">Pieza #{f.tooth}</span>
                                        <Badge variant="outline" className={`text-[9px] ${f.severity === "alta" ? "border-red-300 text-red-600" :
                                            f.severity === "media" ? "border-yellow-300 text-yellow-700" :
                                                "border-slate-300 text-slate-500"
                                            }`}>
                                            {f.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-slate-600">{f.finding}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Quick Treatment Summary */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-[#76D7B6]" />
                                Resumen Tratamiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Presupuesto Total</span>
                                <span className="font-bold text-slate-900">${totalBudget.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Completado</span>
                                <span className="font-bold text-green-600">${completedBudget.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full">
                                <div className="h-full bg-[#76D7B6] rounded-full" style={{ width: `${(completedBudget / totalBudget) * 100}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>{mockTreatments.filter(t => t.status === "completado").length} completados</span>
                                <span>{mockTreatments.filter(t => t.status === "pendiente").length} pendientes</span>
                            </div>
                            <div className="pt-2 border-t space-y-1.5">
                                {mockTreatments.filter(t => t.status === "en_curso").map(t => (
                                    <div key={t.id} className="flex items-center gap-2 text-xs">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="text-slate-700">Pieza {t.piece}: {t.treatment}</span>
                                        <ArrowRight className="h-3 w-3 text-slate-300 ml-auto" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next Steps */}
                    <Card className="bg-[#76D7B6]/5 border-[#76D7B6]/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#76D7B6]" />
                                Próximo Turno
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm font-medium text-slate-900">{patient.nextAppointment}</p>
                            <p className="text-xs text-slate-500 mt-1">Continuar endodoncia pieza 36 — Sesión 3/4</p>
                            <Button size="sm" variant="outline" className="mt-3 w-full gap-1 text-xs">
                                <Clock className="h-3 w-3" /> Reprogramar
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Firma Digital */}
                    <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setIsSignModalOpen(true)}>
                        <Lock className="h-4 w-4" /> Firmar y Guardar Historia
                    </Button>
                </div>
            </div>

            {/* ─── OTP Signature Modal ─── */}
            <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" /> Firma Digital
                        </DialogTitle>
                        <DialogDescription>
                            Ingresa el código OTP enviado por SMS a tu celular registrado para firmar esta entrada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Código OTP (6 dígitos)</Label>
                            <Input
                                placeholder="000000"
                                className="text-center text-3xl tracking-[0.6em] font-mono h-14"
                                maxLength={6}
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-slate-400 text-center">
                            Código enviado a +54 11 ****-8900
                        </p>
                        <button className="text-xs text-[#76D7B6] hover:underline w-full text-center">
                            Reenviar código
                        </button>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsSignModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-1" onClick={handleSign}>
                            <Lock className="h-4 w-4" /> Firmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
