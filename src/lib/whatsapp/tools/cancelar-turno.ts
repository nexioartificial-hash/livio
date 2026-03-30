import { type SupabaseClient } from "@supabase/supabase-js";

export const cancelarTurnoDeclaration = {
  name: "cancelar_turno",
  description:
    "Cancela un turno existente del paciente. Necesita el ID del turno " +
    "(obtenerlo primero con mis_turnos).",
  parameters: {
    type: "object" as const,
    properties: {
      turno_id: {
        type: "string",
        description: "ID del turno a cancelar",
      },
    },
    required: ["turno_id"],
  },
};

export async function cancelarTurno(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string,
  args: { turno_id: string }
): Promise<string> {
  // Verify the appointment belongs to this patient and clinic
  const { data: turno } = await admin
    .from("turno")
    .select("id, date, time, professional_name, status")
    .eq("id", args.turno_id)
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .single();

  if (!turno) {
    return "No encontré ese turno. Usá mis_turnos para ver tus turnos activos.";
  }

  if (turno.status === "cancelado") {
    return "Ese turno ya fue cancelado.";
  }

  const { error } = await admin
    .from("turno")
    .update({ status: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", args.turno_id);

  if (error) {
    console.error("[Tool cancelar_turno] Error:", error.message);
    return "Hubo un error al cancelar. Intentá de nuevo.";
  }

  return `Turno cancelado:\nFecha: ${turno.date}\nHora: ${turno.time}\nProfesional: ${turno.professional_name}`;
}
