"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co");
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key");

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

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

interface InventarioData {
    id?: string;
    clinic_id: string;
    producto: string;
    categoria: string;
    stock_actual: number;
    stock_min: number;
    precio_unit: number;
    vencimiento?: string | null;
    ubicacion?: string;
}

export async function getInventario(clinicId: string) {
    if (!clinicId) return { success: false, error: "clinic_id is required" };

    try {
        await assertCallerOwnsClinic(clinicId);

        const { data, error } = await supabaseAdmin
            .from("inventario")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("categoria")
            .order("producto");

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        if (err.message === "Unauthorized" || err.message === "Forbidden") {
            return { success: false, error: err.message };
        }
        console.error("Error fetching inventario:", err);
        return { success: false, error: "Error al obtener inventario" };
    }
}

export async function saveProducto(data: InventarioData) {
    if (!data.clinic_id) return { success: false, error: "clinic_id is required" };
    if (!data.producto) return { success: false, error: "Producto es requerido" };
    if (!data.categoria) return { success: false, error: "Categoría es requerida" };

    // Validate numeric fields
    if (data.stock_actual < 0 || data.stock_min < 0) return { success: false, error: "Stock no puede ser negativo" };
    if (data.precio_unit < 0) return { success: false, error: "Precio no puede ser negativo" };

    data = { ...data, producto: data.producto.charAt(0).toUpperCase() + data.producto.slice(1) };

    try {
        await assertCallerOwnsClinic(data.clinic_id);

        const { id, ...rest } = data;
        let response;
        if (id) {
            response = await supabaseAdmin
                .from("inventario")
                .update(rest)
                .eq("id", id)
                .select()
                .single();
        } else {
            response = await supabaseAdmin
                .from("inventario")
                .insert([data])
                .select()
                .single();
        }

        if (response.error) throw response.error;
        return { success: true, data: response.data };
    } catch (err: any) {
        if (err.message === "Unauthorized" || err.message === "Forbidden") {
            return { success: false, error: err.message };
        }
        console.error("Error saving producto:", err);
        return { success: false, error: "Error al guardar producto" };
    }
}

export async function deleteProducto(id: string, clinicId: string) {
    if (!id) return { success: false, error: "id is required" };
    if (!clinicId) return { success: false, error: "clinic_id is required" };

    try {
        await assertCallerOwnsClinic(clinicId);

        const { error } = await supabaseAdmin
            .from("inventario")
            .delete()
            .eq("id", id)
            .eq("clinic_id", clinicId); // Extra safety: only delete if it belongs to the clinic

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        if (err.message === "Unauthorized" || err.message === "Forbidden") {
            return { success: false, error: err.message };
        }
        console.error("Error deleting producto:", err);
        return { success: false, error: "Error al eliminar producto" };
    }
}

export async function seedInventarioDefault(clinicId: string) {
    if (!clinicId) return { success: false, error: "clinic_id is required" };

    try {
        await assertCallerOwnsClinic(clinicId);

        // Check-then-insert is mitigated by the unique constraint on (clinic_id, producto)
        const { count, error: countErr } = await supabaseAdmin
            .from("inventario")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", clinicId);

        if (countErr) throw countErr;
        if (count && count > 0) return { success: true, message: "Ya existen insumos" };

        const seedData: any[] = [
            { clinic_id: clinicId, producto: "Resina 3M Filtek Z350", categoria: "Restauración", stock_actual: 5, stock_min: 2, precio_unit: 14500, ubicacion: "Box 1" },
            { clinic_id: clinicId, producto: "Lidocaína 2% con Epinefrina", categoria: "Anestesia", stock_actual: 15, stock_min: 5, precio_unit: 8500, ubicacion: "Heladera Central" },
            { clinic_id: clinicId, producto: "Agujas Cortas 30G x 21mm", categoria: "Consumibles", stock_actual: 4, stock_min: 10, precio_unit: 3200, ubicacion: "Depósito" },
            { clinic_id: clinicId, producto: "Alginato Cromático", categoria: "Impresión", stock_actual: 3, stock_min: 2, precio_unit: 5600, ubicacion: "Box 2" },
            { clinic_id: clinicId, producto: "Silicona por Adición Putty", categoria: "Impresión", stock_actual: 2, stock_min: 1, precio_unit: 21000, ubicacion: "Depósito" },
            { clinic_id: clinicId, producto: "Ácido Grabador 37%", categoria: "Restauración", stock_actual: 8, stock_min: 3, precio_unit: 2800, ubicacion: "Box 1" },
            { clinic_id: clinicId, producto: "Adhesivo Universal 8g", categoria: "Restauración", stock_actual: 1, stock_min: 2, precio_unit: 18500, ubicacion: "Box 1" },
            { clinic_id: clinicId, producto: "Ionomero de Vidrio Tipo I", categoria: "Cementación", stock_actual: 2, stock_min: 1, precio_unit: 11200, ubicacion: "Box 2" },
            { clinic_id: clinicId, producto: "Fresas de Diamante Redonda Mediana", categoria: "Instrumental Rotatorio", stock_actual: 12, stock_min: 5, precio_unit: 1500, ubicacion: "Esterilizadora" },
            { clinic_id: clinicId, producto: "Eyectores de Saliva (x100)", categoria: "Consumibles", stock_actual: 6, stock_min: 3, precio_unit: 4200, ubicacion: "Depósito" },
            { clinic_id: clinicId, producto: "Baberos Odontológicos (x500)", categoria: "Consumibles", stock_actual: 1, stock_min: 2, precio_unit: 15800, ubicacion: "Depósito" },
            { clinic_id: clinicId, producto: "Guantes de Nitrilo Talle M (x100)", categoria: "Consumibles", stock_actual: 10, stock_min: 5, precio_unit: 9500, ubicacion: "Consultorios" },
            { clinic_id: clinicId, producto: "Clorhexidina 0.12% 500ml", categoria: "Prevención", stock_actual: 4, stock_min: 2, precio_unit: 6500, ubicacion: "Box 2" },
            { clinic_id: clinicId, producto: "Hilo Retractor #0", categoria: "Operatoria", stock_actual: 1, stock_min: 2, precio_unit: 3800, ubicacion: "Box 1" },
            { clinic_id: clinicId, producto: "Implante Titanio Cono Morse 3.8x10", categoria: "Implantes", stock_actual: 6, stock_min: 4, precio_unit: 58000, ubicacion: "Vitrina Segura" },
        ];

        const today = new Date();
        seedData[1].vencimiento = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        seedData[6].vencimiento = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        seedData[12].vencimiento = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { error } = await supabaseAdmin.from("inventario").insert(seedData);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        if (err.message === "Unauthorized" || err.message === "Forbidden") {
            return { success: false, error: err.message };
        }
        console.error("Error seeding inventario:", err);
        return { success: false, error: "Error al inicializar inventario" };
    }
}
