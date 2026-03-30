import { type SupabaseClient } from "@supabase/supabase-js";

export const agendarTurnoDeclaration = {
  name: "agendar_turno",
  description:
    "Agenda un turno nuevo para el paciente. Requiere fecha, hora y nombre del profesional. " +
    "Opcionalmente puede incluir el motivo/tratamiento y notas.",
  parameters: {
    type: "object" as const,
    properties: {
      fecha: {
        type: "string",
        description: "Fecha del turno en formato YYYY-MM-DD",
      },
      hora: {
        type: "string",
        description: "Hora del turno en formato HH:MM (24h)",
      },
      profesional: {
        type: "string",
        description: "Nombre del profesional",
      },
      motivo: {
        type: "string",
        description: "Motivo de la consulta o tratamiento",
      },
      notas: {
        type: "string",
        description: "Notas adicionales",
      },
    },
    required: ["fecha", "hora", "profesional"],
  },
};

export async function agendarTurno(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string,
  patientName: string,
  args: {
    fecha: string;
    hora: string;
    profesional: string;
    motivo?: string;
    notas?: string;
  }
): Promise<string> {
  const { fecha, hora, profesional, motivo, notas } = args;

  // Verify the slot is actually free
  const { data: existing } = await admin
    .from("turno")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("date", fecha)
    .eq("time", `${hora}:00`)
    .ilike("professional_name", `%${profesional}%`)
    .in("status", ["confirmado", "pendiente", "scheduled"])
    .limit(1);

  if (existing && existing.length > 0) {
    return `Ese horario ya está ocupado. Usá consultar_disponibilidad para ver horarios libres el ${fecha}.`;
  }

  // Find professional_id
  const { data: prof } = await admin
    .from("professional")
    .select("id, full_name")
    .eq("clinic_id", clinicId)
    .ilike("full_name", `%${profesional}%`)
    .limit(1)
    .single();

  const { error } = await admin.from("turno").insert({
    clinic_id: clinicId,
    date: fecha,
    time: `${hora}:00`,
    patient_id: patientId,
    patient_name: patientName,
    professional_id: prof?.id ?? null,
    professional_name: prof?.full_name ?? profesional,
    reason: motivo ?? null,
    notes: notas ?? null,
    status: "confirmado",
    source: "whatsapp_bot",
    duration: 30,
  });

  if (error) {
    console.error("[Tool agendar_turno] Error:", error.message);
    return "Hubo un error al agendar el turno. Por favor intentá de nuevo.";
  }

  return `Turno agendado con éxito:\nFecha: ${fecha}\nHora: ${hora}\nProfesional: ${prof?.full_name ?? profesional}${motivo ? `\nMotivo: ${motivo}` : ""}`;
}
