"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Saves the odontogram state for a specific patient.
 * It searches for an existing 'odontogram' record or creates a new one.
 */
export async function saveOdontogramState(patientId: string, state: any) {
    const supabase = await createClient();

    try {
        // Find existing clinical record of type 'odontogram'
        const { data: existing, error: findError } = await supabase
            .from("clinical_record")
            .select("id")
            .eq("patient_id", patientId)
            .eq("type", "odontogram")
            .single();

        if (findError && findError.code !== "PGRST116") {
            throw findError;
        }

        if (existing) {
            // Update existing
            const { error: updateError } = await supabase
                .from("clinical_record")
                .update({
                    odontogram_state: state,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id);

            if (updateError) throw updateError;
        } else {
            // Create new
            const { error: insertError } = await supabase
                .from("clinical_record")
                .insert({
                    patient_id: patientId,
                    type: "odontogram",
                    odontogram_state: state
                });

            if (insertError) throw insertError;
        }

        revalidatePath(`/historia-clinica/${patientId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error saving odontogram state:", error);
        return { error: error.message };
    }
}

/**
 * Loads the odontogram state for a specific patient.
 */
export async function getOdontogramState(patientId: string) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("clinical_record")
            .select("odontogram_state")
            .eq("patient_id", patientId)
            .eq("type", "odontogram")
            .single();

        if (error) {
            if (error.code === "PGRST116") return { data: {} }; // No state found
            throw error;
        }

        return { data: data.odontogram_state || {} };
    } catch (error: any) {
        console.error("Error loading odontogram state:", error);
        return { error: error.message };
    }
}
