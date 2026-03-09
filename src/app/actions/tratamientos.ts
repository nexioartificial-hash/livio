"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

export async function getTratamientos(clinicId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from("tratamientos")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("active", true)
            .order("categoria", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching treatments:", error);
        return { success: false, error: error.message };
    }
}

export async function saveTratamiento(data: {
    id?: string;
    clinic_id: string;
    categoria: string;
    nombre: string;
    duracion_min: number;
    precio_promedio: number;
}) {
    try {
        const { id, ...rest } = data;
        
        if (id) {
            const { error } = await supabaseAdmin
                .from("tratamientos")
                .update(rest)
                .eq("id", id);
            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin
                .from("tratamientos")
                .insert([data]);
            if (error) throw error;

            // Al crear tratamiento -> auto-agrega a OS relevantes (activas)
            if (data.nombre) {
                const { data: osData } = await supabaseAdmin
                    .from("clinica_obras_sociales")
                    .select("id, tratamientos")
                    .eq("clinic_id", data.clinic_id)
                    .eq("activo", true);
                    
                if (osData && osData.length > 0) {
                    for (const os of osData) {
                        const currentTratamientos = os.tratamientos || [];
                        if (!currentTratamientos.includes(data.nombre)) {
                            await supabaseAdmin
                                .from("clinica_obras_sociales")
                                .update({ tratamientos: [...currentTratamientos, data.nombre] })
                                .eq("id", os.id);
                        }
                    }
                }
            }
        }

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving treatment:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteTratamiento(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from("tratamientos")
            .update({ active: false })
            .eq("id", id);

        if (error) throw error;
        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting treatment:", error);
        return { success: false, error: error.message };
    }
}

export async function seedTratamientos(clinicId: string) {
    try {
        // Check if already has treatments
        const { count } = await supabaseAdmin
            .from("tratamientos")
            .select("*", { count: 'exact', head: true })
            .eq("clinic_id", clinicId);

        if (count && count > 0) return { success: true, message: "Ya existen tratamientos." };

        const seeds = [
            { clinic_id: clinicId, categoria: 'Consulta/Control', nombre: 'Consulta Inicial y Diagnóstico', duracion_min: 30, precio_promedio: 15000 },
            { clinic_id: clinicId, categoria: 'Consulta/Control', nombre: 'Control Periódico', duracion_min: 20, precio_promedio: 10000 },
            { clinic_id: clinicId, categoria: 'Limpieza/Profilaxis', nombre: 'Limpieza con Ultrasonido', duracion_min: 45, precio_promedio: 25000 },
            { clinic_id: clinicId, categoria: 'Obturación/Caries', nombre: 'Arreglo de Carie Simple (Resina)', duracion_min: 40, precio_promedio: 35000 },
            { clinic_id: clinicId, categoria: 'Endodoncia', nombre: 'Tratamiento de Conducto Unirradicular', duracion_min: 60, precio_promedio: 85000 },
            { clinic_id: clinicId, categoria: 'Extracción', nombre: 'Extracción Simple', duracion_min: 30, precio_promedio: 40000 },
            { clinic_id: clinicId, categoria: 'Extracción', nombre: 'Extracción de Muela de Juicio', duracion_min: 60, precio_promedio: 120000 },
            { clinic_id: clinicId, categoria: 'Implantes', nombre: 'Colocación de Implante Dental', duracion_min: 90, precio_promedio: 450000 },
            { clinic_id: clinicId, categoria: 'Ortodoncia', nombre: 'Control Mensual de Brackets', duracion_min: 20, precio_promedio: 30000 },
            { clinic_id: clinicId, categoria: 'Blanqueamiento', nombre: 'Blanqueamiento Dental LED', duracion_min: 60, precio_promedio: 150000 },
            { clinic_id: clinicId, categoria: 'Periodoncia', nombre: 'Tratamiento Periodontal (Raspaje)', duracion_min: 45, precio_promedio: 45000 },
            { clinic_id: clinicId, categoria: 'Prótesis', nombre: 'Corona de Porcelana', duracion_min: 60, precio_promedio: 250000 },
        ];

        const { error } = await supabaseAdmin.from("tratamientos").insert(seeds);
        if (error) throw error;

        revalidatePath("/config");
        return { success: true };
    } catch (error: any) {
        console.error("Error seeding treatments:", error);
        return { success: false, error: error.message };
    }
}

export async function updateTratamientosPrecios(clinicId: string, percentage: number) {
    try {
        const factor = 1 + (percentage / 100);
        
        // Usamos una consulta RPC o actualizamos todos los activos de la clínica
        // Como no tenemos RPC de SQL crudo, lo hacemos vía Supabase Admin
        // FETCH
        const { data, error: fetchError } = await supabaseAdmin
            .from("tratamientos")
            .select("id, precio_promedio, categoria, nombre")
            .eq("clinic_id", clinicId)
            .eq("active", true);

        if (fetchError) throw fetchError;
        if (!data || data.length === 0) return { success: true, count: 0 };

        const updates = data.map(t => ({
            id: t.id,
            clinic_id: clinicId,
            categoria: t.categoria,
            nombre: t.nombre,
            precio_promedio: Math.round(Number(t.precio_promedio) * factor)
        }));

        const { error: updateError } = await supabaseAdmin
            .from("tratamientos")
            .upsert(updates);

        if (updateError) throw updateError;

        revalidatePath("/config");
        return { success: true, count: updates.length };
    } catch (error: any) {
        console.error("Error updating prices:", error);
        return { success: false, error: error.message };
    }
}
