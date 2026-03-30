import { type SupabaseClient } from "@supabase/supabase-js";

export const consultarDisponibilidadDeclaration = {
  name: "consultar_disponibilidad",
  description:
    "Consulta los horarios disponibles para un turno en una fecha específica. " +
    "Devuelve una lista de slots libres con horario y profesional.",
  parameters: {
    type: "object" as const,
    properties: {
      fecha: {
        type: "string",
        description: "Fecha a consultar en formato YYYY-MM-DD",
      },
      profesional: {
        type: "string",
        description:
          "Nombre del profesional (opcional, si el paciente tiene preferencia)",
      },
    },
    required: ["fecha"],
  },
};

export async function consultarDisponibilidad(
  admin: SupabaseClient,
  clinicId: string,
  args: { fecha: string; profesional?: string }
): Promise<string> {
  const { fecha, profesional } = args;

  // Get existing appointments for that date
  const query = admin
    .from("turno")
    .select("time, duration, professional_name, status")
    .eq("clinic_id", clinicId)
    .eq("date", fecha)
    .in("status", ["confirmado", "pendiente", "scheduled"]);

  if (profesional) {
    query.ilike("professional_name", `%${profesional}%`);
  }

  const { data: turnos } = await query;

  // Get professionals for this clinic
  const profQuery = admin
    .from("professional")
    .select("full_name, specialty")
    .eq("clinic_id", clinicId);

  if (profesional) {
    profQuery.ilike("full_name", `%${profesional}%`);
  }

  const { data: profesionales } = await profQuery;

  // Generate available slots (08:00-20:00, every 30 min)
  const ocupados = new Set(
    (turnos ?? []).map((t) => `${t.time}-${t.professional_name}`)
  );

  const slotsLibres: { hora: string; profesional: string }[] = [];

  for (const prof of profesionales ?? []) {
    for (let h = 8; h < 20; h++) {
      for (const m of [0, 30]) {
        const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const key = `${hora}:00-${prof.full_name}`;
        if (!ocupados.has(key)) {
          slotsLibres.push({
            hora,
            profesional: prof.full_name ?? "Sin asignar",
          });
        }
      }
    }
  }

  if (slotsLibres.length === 0) {
    return `No hay turnos disponibles para el ${fecha}${profesional ? ` con ${profesional}` : ""}. Probá con otra fecha.`;
  }

  // Limit to first 10 to keep message short
  const muestra = slotsLibres.slice(0, 10);
  const lines = muestra.map((s) => `${s.hora} con ${s.profesional}`);

  let result = `Turnos disponibles para el ${fecha}:\n${lines.join("\n")}`;
  if (slotsLibres.length > 10) {
    result += `\n...y ${slotsLibres.length - 10} horarios más.`;
  }

  return result;
}
