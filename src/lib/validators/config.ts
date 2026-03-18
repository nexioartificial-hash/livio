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
    aclaraciones: z.string().max(200, "Máx 200 caracteres").optional().or(z.literal("")),
    phone: z.string().min(10, "Teléfono completo (+54...)"),
    email: z.string().email("Email válido"),
    google_maps_url: z.string().url("Link Maps válido").min(1),
    confirmAddress: z.boolean().refine(v => v, "Debe confirmar ubicación"),
    horarios: z.record(z.string(), z.object({
        enabled: z.boolean(),
        slots: z.array(z.object({
            start: z.string(),
            end: z.string()
        }))
    })).optional(),
});

export type SedeValues = z.infer<typeof sedeSchema>;

export const obraSocialSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    codigo: z.string().optional().or(z.literal("")),
    activo: z.boolean().default(true),
});

export type ObraSocialValues = z.infer<typeof obraSocialSchema>;

export const treatmentSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    categoria: z.string().min(1, "La categoría es requerida"),
    precio: z.string().min(1, "El precio es requerido"),
    duracion: z.string().min(1, "La duración es requerida"),
    color: z.string().optional(),
    noms: z.string().optional().or(z.literal("")),
    activo: z.boolean().default(true),
    descripcion: z.string().optional().or(z.literal("")),
});

export type TreatmentValues = z.infer<typeof treatmentSchema>;

export const stockSchema = z.object({
    nombre: z.string().min(1, "El nombre del producto es requerido"),
    categoria: z.string().min(1, "La categoría es requerida"),
    stock_actual: z.coerce.number().min(0, "Mínimo 0"),
    stock_minimo: z.coerce.number().min(0, "Mínimo 0"),
    sucursal_id: z.string().uuid("Seleccione una sede válida"),
    proveedor: z.string().optional().or(z.literal("")),
    caduca: z.any(),
    lote: z.string().optional().or(z.literal("")),
    precio_compra: z.coerce.number().optional().or(z.literal(0)),
    precio_venta: z.coerce.number().optional().or(z.literal(0)),
    notas: z.string().optional().or(z.literal("")),
    activo: z.boolean().default(true),
});

export type StockValues = z.infer<typeof stockSchema>;
