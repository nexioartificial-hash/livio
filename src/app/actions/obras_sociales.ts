"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"),
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

/** Verifies the calling user belongs to the given clinic. Throws if not. */
async function assertCallerOwnsClinic(clinicId: string): Promise<void> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: prof } = await supabaseAdmin
        .from("professional")
        .select("clinic_id")
        .eq("id", user.id)
        .single();

    if (!prof || prof.clinic_id !== clinicId) throw new Error("Forbidden");
}

export async function getObrasSociales(clinicId: string) {
    try {
        await assertCallerOwnsClinic(clinicId);

        const { data, error } = await supabaseAdmin
            .from("clinica_obras_sociales")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("nombre", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message === "Forbidden") {
            return { success: false, error: error.message };
        }
        console.error("Error fetching health insurances:", error);
        return { success: false, error: "Error al obtener obras sociales" };
    }
}

export async function saveObraSocial(data: {
    id?: string;
    clinic_id: string;
    nombre: string;
    plan: string;
    cobertura_pct: number;
    tratamientos: string[];
    activo: boolean;
}) {
    try {
        await assertCallerOwnsClinic(data.clinic_id);

        const { id, ...rest } = data;

        if (id) {
            const { error } = await supabaseAdmin
                .from("clinica_obras_sociales")
                .update(rest)
                .eq("id", id)
                .eq("clinic_id", data.clinic_id);
            if (error) throw error;
        } else {
            const tratamientosArray = data.tratamientos && data.tratamientos.length > 0
                ? data.tratamientos
                : ["Consulta", "Limpieza", "Obturación", "Endodoncia", "Extracción"];

            const { error } = await supabaseAdmin
                .from("clinica_obras_sociales")
                .insert([{ ...data, tratamientos: tratamientosArray }]);
            if (error) throw error;
        }

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message === "Forbidden") {
            return { success: false, error: error.message };
        }
        console.error("Error saving health insurance:", error);
        return { success: false, error: "Error al guardar obra social" };
    }
}

export async function toggleObraSocial(id: string, clinicId: string, activo: boolean) {
    try {
        await assertCallerOwnsClinic(clinicId);

        const { error } = await supabaseAdmin
            .from("clinica_obras_sociales")
            .update({ activo })
            .eq("id", id)
            .eq("clinic_id", clinicId);

        if (error) throw error;
        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message === "Forbidden") {
            return { success: false, error: error.message };
        }
        console.error("Error toggling health insurance:", error);
        return { success: false, error: "Error al actualizar obra social" };
    }
}

export async function deleteObraSocial(id: string, clinicId: string) {
    try {
        await assertCallerOwnsClinic(clinicId);

        const { error } = await supabaseAdmin
            .from("clinica_obras_sociales")
            .delete()
            .eq("id", id)
            .eq("clinic_id", clinicId);

        if (error) throw error;
        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message === "Forbidden") {
            return { success: false, error: error.message };
        }
        console.error("Error deleting health insurance:", error);
        return { success: false, error: "Error al eliminar obra social" };
    }
}

export async function seedObrasSociales(clinicId: string) {
    try {
        await assertCallerOwnsClinic(clinicId);

        const { count } = await supabaseAdmin
            .from("clinica_obras_sociales")
            .select("*", { count: 'exact', head: true })
            .eq("clinic_id", clinicId);

        if (count && count > 0) return { success: true, message: "Ya existen obras sociales configuradas." };

        const seeds = [
            { clinic_id: clinicId, nombre: 'OSDE', plan: '210 / 310 / 410', cobertura_pct: 100, tratamientos: ['Consulta', 'Limpieza', 'Extracción'], activo: true },
            { clinic_id: clinicId, nombre: 'IOMA', plan: 'Círculo Médico', cobertura_pct: 80, tratamientos: ['Consulta', 'Obturación'], activo: true },
            { clinic_id: clinicId, nombre: 'PAMI', plan: 'Plan General', cobertura_pct: 100, tratamientos: ['Prótesis', 'Consulta'], activo: true },
            { clinic_id: clinicId, nombre: 'Galeno', plan: 'Oro / Plata', cobertura_pct: 90, tratamientos: ['Consulta', 'Blanqueamiento'], activo: true },
            { clinic_id: clinicId, nombre: 'Swiss Medical', plan: 'SMG20 / SMG40', cobertura_pct: 100, tratamientos: ['Limpieza', 'Endodoncia'], activo: true },
            { clinic_id: clinicId, nombre: 'Medicus', plan: 'Azul / Celeste', cobertura_pct: 85, tratamientos: ['Consulta'], activo: true },
            { clinic_id: clinicId, nombre: 'OSDEPYM', plan: 'Personalizado', cobertura_pct: 70, tratamientos: ['Extracción'], activo: true },
            { clinic_id: clinicId, nombre: 'Sancor Salud', plan: '1000 / 2000', cobertura_pct: 100, tratamientos: ['Ortodoncia', 'Consulta'], activo: true },
            { clinic_id: clinicId, nombre: 'Omint', plan: 'O-4500', cobertura_pct: 95, tratamientos: ['Implantes', 'Consulta'], activo: true },
            { clinic_id: clinicId, nombre: 'Prevención Salud', plan: 'A1 / A2', cobertura_pct: 80, tratamientos: ['Endodoncia'], activo: true },
            { clinic_id: clinicId, nombre: 'OSSACRA', plan: 'Básico', cobertura_pct: 60, tratamientos: ['Consulta'], activo: true },
            { clinic_id: clinicId, nombre: 'Unión Personal', plan: 'Classic / Accord', cobertura_pct: 100, tratamientos: ['Consulta', 'Limpieza'], activo: true },
        ];

        const { error } = await supabaseAdmin.from("clinica_obras_sociales").insert(seeds);
        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        if (error.message === "Unauthorized" || error.message === "Forbidden") {
            return { success: false, error: error.message };
        }
        console.error("Error seeding health insurances:", error);
        return { success: false, error: "Error al inicializar obras sociales" };
    }
}
