"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Mail, Phone, Hash, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import HorariosModal from "@/components/config/HorariosModal";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { titleCase, formatCUIT, cleanValue, cuitRegex, phoneRegex } from "@/utils/formatters";

const clinicConfigSchema = z.object({
    nombreComercial: z.string().min(1, "El nombre comercial es requerido"),
    cuit: z.string().refine((val) => {
        const clean = cleanValue(val);
        return clean.length === 11;
    }, "El CUIT debe tener 11 dígitos"),
    emailAdmin: z.string().email("Email inválido"),
    emailGeneral: z
        .string()
        .email("Email inválido")
        .refine((email) => email.endsWith(".com"), "El email debe terminar en .com"),
    telefonoConsultas: z.string().min(10, "Mínimo 10 dígitos").max(15, "Máximo 15 dígitos"),
});

type ClinicConfigValues = z.infer<typeof clinicConfigSchema>;

export default function ClinicConfigForm({ sucursales = [] }: { sucursales?: any[] }) {
    const { user, clinic, loading: authLoading } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isHorariosModalOpen, setIsHorariosModalOpen] = useState(false);
    const supabase = createClient();

    const form = useForm<ClinicConfigValues>({
        resolver: zodResolver(clinicConfigSchema),
        defaultValues: {
            nombreComercial: "",
            cuit: "",
            emailAdmin: user?.email || "",
            emailGeneral: "",
            telefonoConsultas: "",
        },
    });

    // Populate form when clinic data loads
    useEffect(() => {
        if (clinic) {
            form.reset({
                nombreComercial: clinic.name || "",
                cuit: clinic.cuit ? formatCUIT(clinic.cuit) : "",
                emailAdmin: user?.email || "",
                emailGeneral: clinic.email || "",
                telefonoConsultas: clinic.phone ? clinic.phone.replace("+54", "") : "",
            });
        }
    }, [clinic, user, form]);

    async function onSubmit(values: ClinicConfigValues) {
        const clinicId = clinic?.id;
        if (!clinicId) {
            toast.error("No se encontró el ID de la clínica.");
            return;
        }

        setIsSaving(true);
        console.log("Saving clinic data...", { clinicId, values });

        // Safety timeout to prevent permanent lock if network hangs
        const timeout = setTimeout(() => {
            if (isSaving) {
                setIsSaving(false);
                console.warn("Save operation timed out.");
            }
        }, 10000);

        try {
            const { error } = await supabase
                .from("clinic")
                .update({
                    name: values.nombreComercial,
                    cuit: cleanValue(values.cuit),
                    email: values.emailGeneral,
                    phone: `+54${values.telefonoConsultas.replace(/\D/g, "")}`,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", clinicId);

            if (error) throw error;

            toast.success("Configuración de la clínica actualizada");
            console.log("Success: Clinic data updated.");
        } catch (error: any) {
            console.error("Error saving clinic config:", error);
            toast.error("Error al guardar: " + (error.message || "Error desconocido"));
        } finally {
            clearTimeout(timeout);
            setIsSaving(false);
        }
    }

    if (authLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-950/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5 text-accent" />
                    Información General
                </CardTitle>
                <CardDescription>
                    Datos básicos de facturación y contacto de tu clínica.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Nombre Comercial */}
                            <FormField
                                control={form.control}
                                name="nombreComercial"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre Comercial</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    {...field}
                                                    className="pl-9 bg-white dark:bg-slate-950"
                                                    onChange={(e) => {
                                                        const val = titleCase(e.target.value);
                                                        field.onChange(val);
                                                    }}
                                                    placeholder="Ej: Clínica Dental Livio"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cuit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CUIT</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                className="bg-white dark:bg-slate-950"
                                                placeholder="27-44391372-1"
                                                maxLength={14}
                                                onChange={(e) => {
                                                    const formatted = formatCUIT(e.target.value);
                                                    field.onChange(formatted);
                                                }}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email Admin (Readonly) */}
                            <FormField
                                control={form.control}
                                name="emailAdmin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Admin</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    {...field}
                                                    readOnly
                                                    className="pl-9 bg-slate-50 dark:bg-slate-900 cursor-not-allowed"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Teléfono Consultas */}
                            <FormField
                                control={form.control}
                                name="telefonoConsultas"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono Consultas General</FormLabel>
                                        <FormControl>
                                            <div className="flex shadow-sm rounded-md overflow-hidden">
                                                <span className="flex items-center px-3 bg-slate-100 dark:bg-slate-800 border border-input border-r-0 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                                    +54
                                                </span>
                                                <div className="relative flex-1">
                                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        {...field}
                                                        className="pl-9 rounded-l-none bg-white dark:bg-slate-950 border-l-0"
                                                        placeholder="11 2345-6789"
                                                        onChange={(e) => {
                                                            const clean = cleanValue(e.target.value);
                                                            field.onChange(clean);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email General + Horarios button side by side */}
                            <FormField
                                control={form.control}
                                name="emailGeneral"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email General</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    {...field}
                                                    className="pl-9 bg-white dark:bg-slate-950"
                                                    placeholder="contacto@miclinica.com"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription>Email visible por tus pacientes</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Horarios button - prominent action card */}
                            <div className="flex flex-col justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log("ClinicConfigForm: Opening HorariosModal", {
                                            clinicId: clinic?.id,
                                            userClinicId: (user as any)?.clinic_id
                                        });
                                        setIsHorariosModalOpen(true);
                                    }}
                                    className="group w-full h-[68px] flex items-center gap-3 px-4 bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 border border-accent/30 hover:border-accent/60 rounded-xl transition-all duration-200 cursor-pointer"
                                >
                                    <div className="h-8 w-8 bg-accent/20 group-hover:bg-accent/30 rounded-lg flex items-center justify-center shrink-0 transition-colors">
                                        <CalendarDays className="h-4 w-4 text-accent" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">Días y Horarios</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">Configurar disponibilidad</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-start">
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-accent hover:bg-accent/90 text-slate-900 dark:text-white font-medium px-8 h-11"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    "Guardar Cambios"
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>

            <HorariosModal
                isOpen={isHorariosModalOpen}
                onClose={() => setIsHorariosModalOpen(false)}
                clinicId={clinic?.id || (user as any)?.clinic_id || ""}
                initialSedes={sucursales}
            />
        </Card>
    );
}
