"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

export async function getObrasSociales(clinicId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from("clinica_obras_sociales")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("nombre", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching health insurances:", error);
        return { success: false, error: error.message };
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
        const { id, ...rest } = data;
        
        if (id) {
            const { error } = await supabaseAdmin
                .from("clinica_obras_sociales")
                .update(rest)
                .eq("id", id);
            if (error) throw error;
        } else {
            const tratamientosArray = data.tratamientos && data.tratamientos.length > 0 
                ? data.tratamientos 
                : ["Consulta", "Limpieza", "Obturación", "Endodoncia", "Extracción"];

            const insertData = { ...data, tratamientos: tratamientosArray };

            const { error } = await supabaseAdmin
                .from("clinica_obras_sociales")
                .insert([insertData]);
            if (error) throw error;
        }

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving health insurance:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleObraSocial(id: string, activo: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from("clinica_obras_sociales")
            .update({ activo })
            .eq("id", id);

        if (error) throw error;
        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling health insurance:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteObraSocial(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from("clinica_obras_sociales")
            .delete()
            .eq("id", id);

        if (error) throw error;
        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting health insurance:", error);
        return { success: false, error: error.message };
    }
}

export async function seedObrasSociales(clinicId: string) {
    try {
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
        console.error("Error seeding health insurances:", error);
        return { success: false, error: error.message };
    }
}
