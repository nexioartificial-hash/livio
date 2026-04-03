"use server";

import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";

export type ReportePeriodo = "semanal" | "mensual";

export interface ReporteData {
  kpis: {
    ingresos: number;
    pacientes: number;
    noShowRate: number;
    ticketPromedio: number;
  };
  turnosPorDia: { fecha: string; total: number; noshow: number; confirmados: number }[];
  turnosPorHora: { hora: string; lun: number; mar: number; mie: number; jue: number; vie: number; sab: number }[];
  profesionales: {
    nombre: string;
    facturado: number;
    turnos: number;
    pacientes: number;
    hceCompletadas: number;
    hceTotal: number;
  }[];
  tratamientos: { nombre: string; cantidad: number; ingresos: number }[];
  sucursales: string[];
}

export async function getReporteData(
  periodo: ReportePeriodo,
  mes: number,
  anio: number,
  sucursal?: string
): Promise<ReporteData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: prof } = await supabase
    .from("professional")
    .select("clinic_id")
    .eq("id", user.id)
    .single();
  if (!prof?.clinic_id) throw new Error("Sin clínica");

  const clinicId = prof.clinic_id;

  let startDate: string;
  let endDate: string;

  if (periodo === "mensual") {
    const start = DateTime.local(anio, mes + 1, 1);
    startDate = start.toISODate()!;
    endDate = start.endOf("month").toISODate()!;
  } else {
    const now = DateTime.now().setZone("America/Argentina/Buenos_Aires");
    const startOfWeek = now.startOf("week");
    startDate = startOfWeek.toISODate()!;
    endDate = startOfWeek.plus({ days: 6 }).toISODate()!;
  }

  const [turnosRes, tratamientosRes, sucursalesRes, profRes, hceRes] = await Promise.all([
    supabase.from("turno")
      .select("id, date, time, status, professional_name, professional_id, patient_id, reason, sucursal")
      .eq("clinic_id", clinicId).gte("date", startDate).lte("date", endDate),
    supabase.from("tratamientos").select("nombre, precio_promedio").eq("clinic_id", clinicId),
    supabase.from("sucursal").select("nombre").eq("clinic_id", clinicId).order("created_at"),
    supabase.from("professional").select("id, full_name").eq("clinic_id", clinicId),
    supabase.from("clinical_record").select("professional_id, created_at")
      .eq("clinic_id", clinicId).gte("created_at", startDate).lte("created_at", endDate + "T23:59:59"),
  ]);

  const turnos = turnosRes.data ?? [];
  const tratamientos = tratamientosRes.data ?? [];
  const sucursalesList = (sucursalesRes.data ?? []).map(s => s.nombre);
  const profesionales = profRes.data ?? [];
  const hceRecords = hceRes.data ?? [];

  const filtered = sucursal && sucursal !== "Todas"
    ? turnos.filter(t => t.sucursal === sucursal) : turnos;

  const precioMap = new Map(tratamientos.map(t => [t.nombre, t.precio_promedio ?? 0]));

  const confirmados = filtered.filter(t => t.status === "confirmado" || t.status === "completado");
  const noshows = filtered.filter(t => t.status === "noshow");
  const ingresos = confirmados.reduce((sum, t) => sum + (precioMap.get(t.reason ?? "") ?? 0), 0);
  const pacientesUnicos = new Set(confirmados.map(t => t.patient_id)).size;
  const noShowRate = filtered.length > 0 ? (noshows.length / filtered.length) * 100 : 0;

  const turnosByDay = new Map<string, { total: number; noshow: number; confirmados: number }>();
  for (const t of filtered) {
    const day = t.date;
    const entry = turnosByDay.get(day) ?? { total: 0, noshow: 0, confirmados: 0 };
    entry.total++;
    if (t.status === "noshow") entry.noshow++;
    if (t.status === "confirmado" || t.status === "completado") entry.confirmados++;
    turnosByDay.set(day, entry);
  }

  const horaGrid: Record<string, Record<string, number>> = {};
  for (let h = 8; h <= 18; h++) {
    const hora = `${h.toString().padStart(2, "0")}:00`;
    horaGrid[hora] = { lun: 0, mar: 0, mie: 0, jue: 0, vie: 0, sab: 0 };
  }
  const dayMap: Record<number, string> = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab" };
  for (const t of filtered) {
    if (!t.time) continue;
    const hour = t.time.substring(0, 2).padStart(2, "0") + ":00";
    const dt = DateTime.fromISO(t.date);
    const dayKey = dayMap[dt.weekday];
    if (dayKey && horaGrid[hour]) { horaGrid[hour][dayKey]++; }
  }

  const profStats = profesionales.map(p => {
    const profTurnos = filtered.filter(t => t.professional_id === p.id);
    const profConf = profTurnos.filter(t => t.status === "confirmado" || t.status === "completado");
    const profHce = hceRecords.filter(r => r.professional_id === p.id);
    return {
      nombre: p.full_name ?? "Sin nombre",
      facturado: profConf.reduce((sum, t) => sum + (precioMap.get(t.reason ?? "") ?? 0), 0),
      turnos: profTurnos.length,
      pacientes: new Set(profConf.map(t => t.patient_id)).size,
      hceCompletadas: profHce.length,
      hceTotal: profConf.length,
    };
  }).sort((a, b) => b.facturado - a.facturado);

  const treatmentCount = new Map<string, { cantidad: number; ingresos: number }>();
  for (const t of confirmados) {
    const nombre = t.reason ?? "Otros";
    const entry = treatmentCount.get(nombre) ?? { cantidad: 0, ingresos: 0 };
    entry.cantidad++;
    entry.ingresos += precioMap.get(nombre) ?? 0;
    treatmentCount.set(nombre, entry);
  }

  return {
    kpis: { ingresos, pacientes: pacientesUnicos,
      noShowRate: Math.round(noShowRate * 10) / 10,
      ticketPromedio: pacientesUnicos > 0 ? Math.round(ingresos / pacientesUnicos) : 0 },
    turnosPorDia: Array.from(turnosByDay.entries())
      .map(([fecha, data]) => ({ fecha, ...data }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    turnosPorHora: Object.entries(horaGrid).map(([hora, days]) => ({ hora, ...days as { lun: number; mar: number; mie: number; jue: number; vie: number; sab: number } })),
    profesionales: profStats,
    tratamientos: Array.from(treatmentCount.entries())
      .map(([nombre, data]) => ({ nombre, ...data }))
      .sort((a, b) => b.ingresos - a.ingresos),
    sucursales: sucursalesList,
  };
}
