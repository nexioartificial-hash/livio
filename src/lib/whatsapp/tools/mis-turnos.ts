import { type SupabaseClient } from "@supabase/supabase-js";

export const misTurnosDeclaration = {
  name: "mis_turnos",
  description:
    "Lista los próximos turnos del paciente. Muestra fecha, hora, profesional y estado.",
  parameters: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

export async function misTurnos(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const { data: turnos } = await admin
    .from("turno")
    .select("id, date, time, professional_name, reason, status")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .gte("date", today)
    .in("status", ["confirmado", "pendiente", "scheduled"])
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(10);

  if (!turnos || turnos.length === 0) {
    return "No tenés turnos próximos agendados.";
  }

  const lines = turnos.map(
    (t) =>
      `${t.date} a las ${t.time} con ${t.professional_name}${t.reason ? ` (${t.reason})` : ""} [ID: ${t.id.slice(0, 8)}]`
  );

  return `Tus próximos turnos:\n${lines.join("\n")}`;
}
