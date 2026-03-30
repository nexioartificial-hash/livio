import { type SupabaseClient } from "@supabase/supabase-js";

export const registrarPacienteDeclaration = {
  name: "registrar_paciente",
  description:
    "Registra un paciente nuevo en el sistema. Usar cuando es la primera vez " +
    "que el paciente contacta a la clínica y no está registrado.",
  parameters: {
    type: "object" as const,
    properties: {
      nombre: {
        type: "string",
        description: "Nombre completo del paciente",
      },
      telefono: {
        type: "string",
        description: "Número de teléfono del paciente",
      },
    },
    required: ["nombre", "telefono"],
  },
};

export async function registrarPaciente(
  admin: SupabaseClient,
  clinicId: string,
  args: { nombre: string; telefono: string }
): Promise<{ message: string; patientId: string | null }> {
  const cleanPhone = args.telefono.replace(/\D/g, "");

  // Check if already exists
  const { data: existing } = await admin
    .from("patient")
    .select("id, full_name")
    .eq("clinic_id", clinicId)
    .eq("phone", cleanPhone)
    .limit(1)
    .single();

  if (existing) {
    return {
      message: `Ya estás registrado como ${existing.full_name}.`,
      patientId: existing.id,
    };
  }

  const { data: newPatient, error } = await admin
    .from("patient")
    .insert({
      clinic_id: clinicId,
      full_name: args.nombre,
      phone: cleanPhone,
      status: "activo",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Tool registrar_paciente] Error:", error.message);
    return {
      message: "Hubo un error al registrarte. Intentá de nuevo.",
      patientId: null,
    };
  }

  return {
    message: `¡Listo! Te registré como ${args.nombre}. Ya podés agendar turnos.`,
    patientId: newPatient?.id ?? null,
  };
}
