"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { validatePassword, getStrengthLabel } from "@/lib/security/password-validator";
import {
    toTitleCase, validateClinicName, formatCUIT, validateCUIT,
    validateEmail, sanitizeText,
} from "@/lib/security/register-validators";
import { postRegistration } from "@/app/actions/register";

// Password requirement checks (for individual checklist items)
function getPasswordChecks(pw: string) {
    return [
        { label: "Mínimo 8 caracteres", ok: pw.length >= 8 },
        { label: "Una letra mayúscula", ok: /[A-Z]/.test(pw) },
        { label: "Una letra minúscula", ok: /[a-z]/.test(pw) },
        { label: "Un número", ok: /\d/.test(pw) },
        { label: "Un carácter especial", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw) },
    ];
}

interface FieldErrors {
    clinicName?: string;
    cuit?: string;
    email?: string;
    password?: string;
}

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const router = useRouter();

    const [formData, setFormData] = useState({
        clinicName: "",
        cuit: "",
        email: "",
        password: "",
        fullName: "",
        license: "",
    });

    // ─── Field Handlers ──────────────────────────────────────

    const handleClinicNameChange = useCallback((value: string) => {
        const formatted = toTitleCase(value);
        setFormData(prev => ({ ...prev, clinicName: formatted }));
        if (touched.clinicName) {
            const v = validateClinicName(formatted);
            setFieldErrors(prev => ({ ...prev, clinicName: v.error }));
        }
    }, [touched.clinicName]);

    const handleCUITChange = useCallback((value: string) => {
        const formatted = formatCUIT(value);
        setFormData(prev => ({ ...prev, cuit: formatted }));
        if (touched.cuit) {
            const v = validateCUIT(formatted);
            setFieldErrors(prev => ({ ...prev, cuit: v.error }));
        }
    }, [touched.cuit]);

    const handleEmailChange = useCallback((value: string) => {
        setFormData(prev => ({ ...prev, email: value }));
        setEmailSuggestion(null);
        if (touched.email) {
            const v = validateEmail(value);
            setFieldErrors(prev => ({ ...prev, email: v.error }));
            setEmailSuggestion(v.suggestion || null);
        }
    }, [touched.email]);

    const handlePasswordChange = useCallback((value: string) => {
        setFormData(prev => ({ ...prev, password: value }));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        switch (name) {
            case "clinicName": handleClinicNameChange(value); break;
            case "cuit": handleCUITChange(value); break;
            case "email": handleEmailChange(value); break;
            case "password": handlePasswordChange(value); break;
            default: setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // ─── Blur Handlers (validate on blur) ────────────────────

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));

        switch (field) {
            case "clinicName": {
                const v = validateClinicName(formData.clinicName);
                setFieldErrors(prev => ({ ...prev, clinicName: v.error }));
                break;
            }
            case "cuit": {
                const v = validateCUIT(formData.cuit);
                setFieldErrors(prev => ({ ...prev, cuit: v.error }));
                break;
            }
            case "email": {
                const v = validateEmail(formData.email);
                setFieldErrors(prev => ({ ...prev, email: v.error }));
                setEmailSuggestion(v.suggestion || null);
                break;
            }
        }
    };

    // ─── Password Validation ─────────────────────────────────

    const passwordValidation = validatePassword(formData.password, formData.email, formData.clinicName);
    const passwordStrength = getStrengthLabel(passwordValidation.score);
    const passwordChecks = getPasswordChecks(formData.password);
    const allPasswordChecksPassed = passwordChecks.every(c => c.ok);

    // ─── Step 1 Form Validity ────────────────────────────────

    const isStep1Valid =
        validateClinicName(formData.clinicName).valid &&
        validateCUIT(formData.cuit).valid &&
        validateEmail(formData.email).valid &&
        passwordValidation.valid;

    // ─── Email Suggestion Accept ─────────────────────────────

    const acceptEmailSuggestion = () => {
        if (!emailSuggestion) return;
        // Extract email from "¿Quisiste decir xxx?"
        const match = emailSuggestion.match(/decir (.+)\?/);
        if (match) {
            setFormData(prev => ({ ...prev, email: match[1] }));
            setEmailSuggestion(null);
            setFieldErrors(prev => ({ ...prev, email: undefined }));
        }
    };

    // ─── Submit Handler ──────────────────────────────────────

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 1) {
            // Validate all fields
            const nameV = validateClinicName(formData.clinicName);
            const cuitV = validateCUIT(formData.cuit);
            const emailV = validateEmail(formData.email);

            setFieldErrors({
                clinicName: nameV.error,
                cuit: cuitV.error,
                email: emailV.error,
                password: !passwordValidation.valid ? "La contraseña no cumple los requisitos" : undefined,
            });
            setTouched({ clinicName: true, cuit: true, email: true, password: true });

            if (!nameV.valid || !cuitV.valid || !emailV.valid || !passwordValidation.valid) {
                return;
            }

            setStep(2);
            return;
        }

        // Step 2 — final submit
        if (loading) return; // Anti double-click
        setLoading(true);

        try {
            const sanitizedClinicName = sanitizeText(formData.clinicName);
            const sanitizedEmail = formData.email.trim().toLowerCase();
            const sanitizedCuit = formData.cuit.trim() || null;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: sanitizedEmail,
                password: formData.password,
                options: {
                    data: {
                        full_name: sanitizeText(formData.fullName),
                        license: formData.license.trim(),
                        clinic_name: sanitizedClinicName,
                        cuit: sanitizedCuit,
                    },
                },
            });

            if (authError) {
                toast.error("Error al registrar. Verificá los datos e intentá de nuevo.");
                setLoading(false);
                return;
            }

            if (authData.user) {
                await supabase.from("professional").upsert({
                    id: authData.user.id,
                    full_name: sanitizeText(formData.fullName),
                    license: formData.license.trim(),
                    role: "owner",
                    is_onboarded: false,
                }, { onConflict: "id" });

                // Send branded verification email via Resend
                await postRegistration({
                    userId: authData.user.id,
                    email: sanitizedEmail,
                    clinicName: sanitizedClinicName,
                    fullName: sanitizeText(formData.fullName),
                });
            }

            toast.success("¡Cuenta creada! Revisá tu email para confirmar.");
            router.push(`/check-email?email=${encodeURIComponent(sanitizedEmail)}`);
        } catch {
            toast.error("Error de conexión. Intentá de nuevo.");
            setLoading(false);
        }
    };

    // ─── Render ──────────────────────────────────────────────

    return (
        <div className="relative flex h-screen flex-col items-center justify-center px-4 overflow-hidden">
            {/* Background image — same as login */}
            <Image
                src="/login-bg.png"
                alt=""
                fill
                className="object-cover"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />

            <div className="relative z-10 w-full max-w-md space-y-6 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.25),0_8px_20px_rgba(0,0,0,0.1)] border border-white/50">
                <div className="flex flex-col items-center text-center">
                    <Image
                        src="/logo-transparent.png"
                        alt="Livio"
                        width={100}
                        height={40}
                        className="mb-6 opacity-80"
                    />
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        {step === 1 ? "Datos de la Clínica" : "Tu Perfil Profesional"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Comienza tu prueba gratuita de 30 días
                    </p>

                    <div className="flex items-center gap-2 mt-4">
                        <div className={`h-2 w-8 rounded-full ${step >= 1 ? "bg-[#76D7B6]" : "bg-slate-200"}`}></div>
                        <div className={`h-2 w-8 rounded-full ${step >= 2 ? "bg-[#76D7B6]" : "bg-slate-200"}`}></div>
                    </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4 mt-6">
                    {step === 1 && (
                        <>
                            {/* Clinic Name */}
                            <div className="space-y-2">
                                <Label htmlFor="clinicName">Nombre de la Clínica / Consultorio</Label>
                                <Input
                                    id="clinicName"
                                    name="clinicName"
                                    placeholder="Ej: Consultorios Dentales Livio"
                                    required
                                    autoComplete="organization"
                                    aria-required="true"
                                    aria-invalid={!!fieldErrors.clinicName}
                                    aria-describedby={fieldErrors.clinicName ? "clinicName-error" : undefined}
                                    value={formData.clinicName}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur("clinicName")}
                                />
                                {fieldErrors.clinicName && (
                                    <p id="clinicName-error" role="alert" className="text-xs text-red-500">{fieldErrors.clinicName}</p>
                                )}
                            </div>

                            {/* CUIT */}
                            <div className="space-y-2">
                                <Label htmlFor="cuit">CUIT (Opcional)</Label>
                                <Input
                                    id="cuit"
                                    name="cuit"
                                    placeholder="XX-XXXXXXXX-X"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    aria-invalid={!!fieldErrors.cuit}
                                    aria-describedby={fieldErrors.cuit ? "cuit-error" : undefined}
                                    value={formData.cuit}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur("cuit")}
                                />
                                {fieldErrors.cuit && (
                                    <p id="cuit-error" role="alert" className="text-xs text-red-500">{fieldErrors.cuit}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Corporativo</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="admin@clinica.com"
                                    required
                                    autoComplete="email"
                                    inputMode="email"
                                    aria-required="true"
                                    aria-invalid={!!fieldErrors.email}
                                    aria-describedby={fieldErrors.email ? "email-error" : emailSuggestion ? "email-suggestion" : undefined}
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur("email")}
                                />
                                {fieldErrors.email && (
                                    <p id="email-error" role="alert" className="text-xs text-red-500">{fieldErrors.email}</p>
                                )}
                                {emailSuggestion && !fieldErrors.email && (
                                    <p id="email-suggestion" className="text-xs text-amber-600">
                                        {emailSuggestion}{" "}
                                        <button type="button" onClick={acceptEmailSuggestion} className="underline font-medium">
                                            Sí, corregir
                                        </button>
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        autoComplete="new-password"
                                        aria-required="true"
                                        aria-invalid={touched.password && !passwordValidation.valid}
                                        value={formData.password}
                                        onChange={handleChange}
                                        onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {/* Password strength bar + checklist */}
                                {formData.password && (
                                    <div className="space-y-2 mt-1" aria-live="polite">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div
                                                    key={i}
                                                    className="h-1 flex-1 rounded-full transition-colors"
                                                    style={{ backgroundColor: i <= passwordValidation.score ? passwordStrength.color : "#e2e8f0" }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs font-medium" style={{ color: passwordStrength.color }}>{passwordStrength.label}</p>
                                        <div className="space-y-0.5">
                                            {passwordChecks.map((check, i) => (
                                                <div key={i} className="flex items-center gap-1.5">
                                                    {check.ok
                                                        ? <Check className="h-3 w-3 text-green-500" />
                                                        : <X className="h-3 w-3 text-slate-300" />
                                                    }
                                                    <span className={`text-[11px] ${check.ok ? "text-green-600" : "text-slate-400"}`}>
                                                        {check.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nombre Completo</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Dr. Juan Pérez"
                                    required
                                    autoComplete="name"
                                    aria-required="true"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license">Matrícula Nacional (MN)</Label>
                                <Input
                                    id="license"
                                    name="license"
                                    placeholder="Ej: 123456"
                                    required
                                    aria-required="true"
                                    value={formData.license}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="p-4 bg-[#76D7B6]/10 rounded-lg text-sm text-slate-600 mt-4">
                                <p className="font-semibold text-[#76D7B6] mb-1">✨ Plan Trial</p>
                                <p>Tendrás acceso total a todas las funciones premium por 30 días. Sin cargos automáticos.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-slate-500 hover:text-slate-700 underline w-full text-center"
                            >
                                ← Volver al paso anterior
                            </button>
                        </>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-[#76D7B6] hover:bg-[#65cba8] text-white font-bold"
                        disabled={loading || (step === 1 && !isStep1Valid)}
                        aria-disabled={loading || (step === 1 && !isStep1Valid)}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {step === 1 ? "Continuar" : "Crear Cuenta"}
                    </Button>
                </form>

                <div className="text-center text-sm">
                    <span className="text-slate-500">¿Ya tienes cuenta? </span>
                    <Link href="/login" className="font-semibold text-slate-900 hover:underline">
                        Iniciar Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
