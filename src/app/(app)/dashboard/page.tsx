import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const admin = createAdminClient();

    // Get clinic_id from professional record
    const { data: prof } = await admin
        .from("professional")
        .select("clinic_id, full_name")
        .eq("id", user.id)
        .single();

    const clinicId = prof?.clinic_id;
    const userName = prof?.full_name?.split(" ")[0]
        || user.user_metadata?.full_name?.split(" ")[0]
        || user.user_metadata?.name?.split(" ")[0]
        || "Usuario";

    if (!clinicId) {
        return <DashboardClient
            userName={userName}
            clinicId=""
            initialStats={{ turnosHoy: { total: 0, conf: 0, pend: 0, trend: 0 }, leads24h: 0, noShowRate: 0, ingresosHoy: 0 }}
            initialTareas={[]}
            initialAlertas={[]}
            initialProximosTurnos={[]}
        />;
    }

    const now = DateTime.now();
    const today = now.toISODate()!;
    const yesterday = now.minus({ days: 1 }).toISODate()!;
    const last7Days = now.minus({ days: 7 }).toISODate()!;
    const next30Days = now.plus({ days: 30 }).toISODate()!;
    const currentTime = now.toFormat("HH:mm");

    const [
        turnosHoyRes,
        turnosAyerRes,
        turnos7dRes,
        leads24hRes,
        tasksRes,
        alertsRes,
        tratamientosRes,
        inventarioAlertsRes,
        turnosCanceladosRes,
    ] = await Promise.all([
        admin.from("turno").select("id, status, reason, time, patient_name, professional_name").eq("clinic_id", clinicId).eq("date", today),
        admin.from("turno").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("date", yesterday),
        admin.from("turno").select("date, status").eq("clinic_id", clinicId).gte("date", last7Days).lte("date", today),
        admin.from("lead").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", now.minus({ hours: 24 }).toISO()!),
        admin.from("tarea").select("id, titulo, completada, created_at").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(20),
        admin.from("alerta").select("id, mensaje, tipo, created_at").eq("clinic_id", clinicId).eq("leida", false).order("created_at", { ascending: false }).limit(10),
        admin.from("tratamientos").select("nombre, precio_promedio").eq("clinic_id", clinicId).eq("active", true),
        admin.from("inventario").select("producto, stock_actual, stock_min, vencimiento").eq("clinic_id", clinicId).or(`stock_actual.lte.stock_min,vencimiento.lte.${next30Days}`),
        admin.from("turno").select("patient_name, time").eq("clinic_id", clinicId).eq("date", today).eq("status", "cancelado"),
    ]);

    // KPI calculations
    const turnosHoyData: any[] = turnosHoyRes.data || [];
    const tHoyTotal = turnosHoyData.length;
    const tHoyConf = turnosHoyData.filter((t) => t.status === "confirmado").length;
    const tHoyPend = turnosHoyData.filter((t) => t.status === "pendiente" || !t.status).length;
    const tAyerCount = turnosAyerRes.count || 0;
    const turnosTrend = tAyerCount === 0 ? 0 : Math.round(((tHoyTotal - tAyerCount) / tAyerCount) * 100);

    const turnos7d: any[] = turnos7dRes.data || [];
    const noShowCount = turnos7d.filter((t) => t.status === "noshow").length;
    const noShowRate = turnos7d.length === 0 ? 0 : Math.round((noShowCount / turnos7d.length) * 100);

    const precioMap = new Map<string, number>();
    tratamientosRes.data?.forEach((t: any) => precioMap.set(t.nombre, Number(t.precio_promedio)));
    const ingresosHoy = turnosHoyData
        .filter((t) => t.status === "confirmado")
        .reduce((acc, t) => acc + (precioMap.get(t.reason) || 15000), 0);

    // System alerts
    const systemAlerts: any[] = [];
    inventarioAlertsRes.data?.forEach((item: any) => {
        if (item.stock_actual <= item.stock_min) {
            systemAlerts.push({ id: `stock-${item.producto}`, mensaje: `Stock bajo: ${item.producto} (${item.stock_actual} disp.)`, hora: "Ahora", tipo: "warning" });
        }
        if (item.vencimiento && item.vencimiento <= next30Days) {
            systemAlerts.push({ id: `venc-${item.producto}`, mensaje: `Vencimiento próximo: ${item.producto} (${DateTime.fromISO(item.vencimiento).toFormat("dd/MM")})`, hora: "Recordatorio", tipo: "warning" });
        }
    });
    turnosCanceladosRes.data?.forEach((t: any) => {
        systemAlerts.push({ id: `cancel-${t.patient_name}-${t.time}`, mensaje: `Turno cancelado: ${t.patient_name} (${t.time.substring(0, 5)}hs)`, hora: "Hoy", tipo: "info" });
    });
    const dbAlerts = (alertsRes.data || []).map((a: any) => ({
        id: a.id, mensaje: a.mensaje,
        hora: DateTime.fromISO(a.created_at).toFormat("HH:mm"),
        tipo: a.tipo || "info",
    }));

    // Upcoming appointments
    const futureAppointments = turnosHoyData
        .filter((t) => t.time >= currentTime)
        .sort((a, b) => a.time.localeCompare(b.time));

    const proximosTurnos = futureAppointments.slice(0, 5).map((t: any) => ({
        id: t.id,
        hora: t.time.substring(0, 5),
        paciente: t.patient_name,
        profesional: t.professional_name || "Dentista",
        status: t.status || "pendiente",
    }));

    return (
        <DashboardClient
            userName={userName}
            clinicId={clinicId}
            initialStats={{ turnosHoy: { total: tHoyTotal, conf: tHoyConf, pend: tHoyPend, trend: turnosTrend }, leads24h: leads24hRes.count || 0, noShowRate, ingresosHoy }}
            initialTareas={tasksRes.data || []}
            initialAlertas={[...systemAlerts, ...dbAlerts]}
            initialProximosTurnos={proximosTurnos}
        />
    );
}
