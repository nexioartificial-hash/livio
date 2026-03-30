import { type SupabaseClient } from "@supabase/supabase-js";

export const infoTratamientosDeclaration = {
  name: "info_tratamientos",
  description:
    "Lista los tratamientos disponibles en la clínica con sus precios. " +
    "Puede filtrar por categoría si el paciente lo indica.",
  parameters: {
    type: "object" as const,
    properties: {
      categoria: {
        type: "string",
        description: "Categoría de tratamiento para filtrar (opcional)",
      },
    },
    required: [],
  },
};

export async function infoTratamientos(
  admin: SupabaseClient,
  clinicId: string,
  args: { categoria?: string }
): Promise<string> {
  const query = admin
    .from("tratamientos")
    .select("nombre, precio, categoria")
    .eq("clinic_id", clinicId);

  if (args.categoria) {
    query.ilike("categoria", `%${args.categoria}%`);
  }

  const { data: tratamientos } = await query.order("categoria").limit(20);

  if (!tratamientos || tratamientos.length === 0) {
    return args.categoria
      ? `No encontré tratamientos en la categoría "${args.categoria}".`
      : "No hay tratamientos cargados en el sistema.";
  }

  const lines = tratamientos.map(
    (t) =>
      `${t.nombre}${t.precio ? ` — $${t.precio}` : ""}${t.categoria ? ` (${t.categoria})` : ""}`
  );

  return `Tratamientos disponibles:\n${lines.join("\n")}`;
}
