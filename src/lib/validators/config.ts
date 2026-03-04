import * as z from "zod";
import { titleCase } from "@/utils/masks";

export const clinicConfigSchema = z.object({
    name: z.string().min(1, "El nombre comercial es requerido"),
    email: z.string().email("Email de administración inválido"),
    email_clinic: z.string().email("Email de la clínica inválido").optional().or(z.literal("")),
    cuit: z
        .string()
        .optional()
        .refine(
            (val) => !val || /^\d{2}-\d{8}-\d{1}$/.test(val),
            "Formato CUIT inválido (XX-XXXXXXXX-X)"
        ),
    phone: z.string().min(1, "El teléfono es requerido"),
});

export type ClinicConfigValues = z.infer<typeof clinicConfigSchema>;

export const sedeSchema = z.object({
    name: z.string().min(1, "Nombre requerido").transform(titleCase),
    address: z.string().min(1, "Dirección requerida"),
    location: z.string().min(1, "Localidad requerida"),
    aclaraciones: z.string().min(1, "Aclaraciones requeridas (depto/timbre...)").max(200, "Máx 200 caracteres"),
    phone: z.string().min(10, "Teléfono completo (+54...)"),
    email: z.string().email("Email válido").min(1),
    google_maps_url: z.string().url("Link Maps válido").min(1),
    confirmAddress: z.boolean().refine(v => v, "Debe confirmar ubicación"),
});

export type SedeValues = z.infer<typeof sedeSchema>;
