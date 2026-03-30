import { type SupabaseClient } from "@supabase/supabase-js";

export const infoClinicaDeclaration = {
  name: "info_clinica",
  description:
    "Devuelve información general de la clínica: nombre, dirección, teléfono, " +
    "horarios de atención y profesionales disponibles.",
  parameters: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

export async function infoClinica(
  admin: SupabaseClient,
  clinicId: string
): Promise<string> {
  const { data: clinic } = await admin
    .from("clinic")
    .select("name, phone, email, email_clinic")
    .eq("id", clinicId)
    .single();

  const { data: profesionales } = await admin
    .from("professional")
    .select("full_name, specialty")
    .eq("clinic_id", clinicId);

  if (!clinic) {
    return "No se encontró información de la clínica.";
  }

  let info = `${clinic.name}`;
  if (clinic.phone) info += `\nTeléfono: ${clinic.phone}`;
  if (clinic.email_clinic || clinic.email)
    info += `\nEmail: ${clinic.email_clinic ?? clinic.email}`;

  if (profesionales && profesionales.length > 0) {
    info += "\n\nProfesionales:";
    for (const p of profesionales) {
      info += `\n${p.full_name ?? "Sin nombre"}${p.specialty ? ` (${p.specialty})` : ""}`;
    }
  }

  return info;
}
