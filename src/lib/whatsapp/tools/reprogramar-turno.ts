import { type SupabaseClient } from "@supabase/supabase-js";

export const reprogramarTurnoDeclaration = {
  name: "reprogramar_turno",
  description:
    "Reprograma un turno existente a una nueva fecha y hora. " +
    "Necesita el ID del turno (obtenerlo con mis_turnos) y la nueva fecha/hora.",
  parameters: {
    type: "object" as const,
    properties: {
      turno_id: {
        type: "string",
        description: "ID del turno a reprogramar",
      },
      nueva_fecha: {
        type: "string",
        description: "Nueva fecha en formato YYYY-MM-DD",
      },
      nueva_hora: {
        type: "string",
        description: "Nueva hora en formato HH:MM (24h)",
      },
    },
    required: ["turno_id", "nueva_fecha", "nueva_hora"],
  },
};

export async function reprogramarTurno(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string,
  args: { turno_id: string; nueva_fecha: string; nueva_hora: string }
): Promise<string> {
  const { turno_id, nueva_fecha, nueva_hora } = args;

  // Verify ownership
  const { data: turno } = await admin
    .from("turno")
    .select("id, date, time, professional_name, professional_id")
    .eq("id", turno_id)
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .single();

  if (!turno) {
    return "No encontré ese turno. Usá mis_turnos para ver tus turnos activos.";
  }

  // Check the new slot is free
  const { data: conflict } = await admin
    .from("turno")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("date", nueva_fecha)
    .eq("time", `${nueva_hora}:00`)
    .eq("professional_name", turno.professional_name)
    .in("status", ["confirmado", "pendiente", "scheduled"])
    .limit(1);

  if (conflict && conflict.length > 0) {
    return `El horario ${nueva_hora} del ${nueva_fecha} con ${turno.professional_name} ya está ocupado. Consultá disponibilidad para esa fecha.`;
  }

  const { error } = await admin
    .from("turno")
    .update({
      date: nueva_fecha,
      time: `${nueva_hora}:00`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", turno_id);

  if (error) {
    console.error("[Tool reprogramar_turno] Error:", error.message);
    return "Hubo un error al reprogramar. Intentá de nuevo.";
  }

  return `Turno reprogramado:\nAntes: ${turno.date} a las ${turno.time}\nAhora: ${nueva_fecha} a las ${nueva_hora}\nProfesional: ${turno.professional_name}`;
}
