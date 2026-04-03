"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const sidebarItems = [
    { id: "intro", label: "Introducción" },
    { id: "definiciones", label: "1. Definiciones" },
    { id: "aceptacion", label: "2. Aceptación" },
    { id: "cuentas", label: "3. Cuentas" },
    { id: "suscripcion", label: "4. Suscripción" },
    { id: "uso-permitido", label: "5. Uso Permitido" },
    { id: "propiedad-intelectual", label: "6. Propiedad Intelectual" },
    { id: "datos-clinicos", label: "7. Datos Clínicos" },
    { id: "garantias", label: "8. Garantías" },
    { id: "responsabilidad", label: "9. Responsabilidad" },
    { id: "terminacion", label: "11. Terminación" },
    { id: "disputas", label: "13. Disputas" },
];

export default function TermsPage() {
    const [activeSection, setActiveSection] = useState("intro");

    useEffect(() => {
        // Inyectar Material Symbols
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.5 }
        );

        document.querySelectorAll("section[id]").forEach((section) => {
            observer.observe(section);
        });

        return () => {
            observer.disconnect();
            document.head.removeChild(link);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-accent/30 selection:text-[#5cb99a]">
            <Header />

            {/* Subheader decorativo */}
            <header className="pt-32 pb-1 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-sm font-medium text-slate-400">
                    <Link href="/" className="hover:text-accent transition-colors">Inicio</Link>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="text-slate-600 dark:text-slate-400">Términos y Condiciones</span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-12 md:py-20">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                        Términos y <span className="text-accent">Condiciones</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                        Última actualización: <span className="font-medium text-slate-900 dark:text-white">4 de marzo de 2026</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <aside className="lg:col-span-3">
                        <nav className="sticky top-28 space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">Contenido</p>
                            {sidebarItems.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className={cn(
                                        "flex items-center px-4 py-3 text-sm rounded-r-lg transition-all",
                                        activeSection === item.id
                                            ? "border-l-[3px] border-accent bg-accent/5 font-semibold text-[#5cb99a]"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800"
                                    )}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </aside>

                    <div className="lg:col-span-9 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 shadow-sm">
                        <section className="mb-12" id="intro">
                            <div className="bg-accent/5 border-l-4 border-accent p-6 rounded-r-xl italic text-slate-700 dark:text-slate-300 leading-relaxed">
                                <strong>¡Bienvenido a Livio!</strong> Livio es un software SaaS especializado en la gestión integral de clínicas odontológicas argentinas. Al acceder o usar el Servicio, aceptas estos Términos y Condiciones que forman un acuerdo legal vinculante.
                            </div>
                        </section>

                        <div className="prose prose-slate dark:prose-invert max-w-none space-y-16 text-slate-600 dark:text-slate-400">
                            <section id="definiciones">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">1</span>
                                    <h2 className="text-2xl font-bold m-0">Definiciones</h2>
                                </div>
                                <ul className="list-none p-0 space-y-4">
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-accent text-sm mt-1">circle</span>
                                        <span><strong>Usuario:</strong> Dueño, administrador, recepcionista o profesional odontólogo registrado en Livio.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-accent text-sm mt-1">circle</span>
                                        <span><strong>Suscripción:</strong> Plan único mensual de $99.000 ARS (IVA incluido).</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-accent text-sm mt-1">circle</span>
                                        <span><strong>Datos Clínicos:</strong> Información sensible protegida por Ley 27.706.</span>
                                    </li>
                                </ul>
                            </section>

                            <section id="aceptacion">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">2</span>
                                    <h2 className="text-2xl font-bold m-0">Aceptación y Elegibilidad</h2>
                                </div>
                                <p>Debes tener al menos 18 años y ser titular de una clínica odontológica en Argentina con CUIT válido. Tu uso continuo implica aceptación de modificaciones, las cuales notificaremos con 15 días de antelación.</p>
                            </section>

                            <section id="cuentas">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">3</span>
                                    <h2 className="text-2xl font-bold m-0">Cuentas y Seguridad</h2>
                                </div>
                                <p>Regístrate con email, CUIT y matrícula nacional. Eres responsable de mantener confidenciales tus credenciales. Podemos suspender cuentas por violaciones, impago o riesgo legal.</p>
                            </section>

                            <section id="suscripcion">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">4</span>
                                    <h2 className="text-2xl font-bold m-0">Suscripción y Pagos</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900">
                                        <h4 className="font-bold text-[#5cb99a] mb-2 uppercase text-xs tracking-widest">Plan Único</h4>
                                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">$99.000 <span className="text-sm font-normal text-slate-500 dark:text-slate-400">ARS/mes</span></p>
                                    </div>
                                    <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900">
                                        <h4 className="font-bold text-[#5cb99a] mb-2 uppercase text-xs tracking-widest">Prueba Gratis</h4>
                                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">30 Días</p>
                                    </div>
                                </div>
                                <p>No hay reembolsos después del uso. Cancelación en cualquier momento vía dashboard (con efecto al final del período). Suspensión tras 7 días de impago.</p>
                            </section>

                            <section id="uso-permitido">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">5</span>
                                    <h2 className="text-2xl font-bold m-0">Uso Permitido y Prohibiciones</h2>
                                </div>
                                <p><strong>Permitido:</strong> Gestión de agenda, pacientes, HCE y chatbot para tu clínica (hasta 5 sucursales).</p>
                                <p><strong>Prohibido:</strong> Datos falsos, scraping, ingeniería inversa, reventa o violación de la Ley 27.706.</p>
                            </section>

                            <section id="propiedad-intelectual">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">6</span>
                                    <h2 className="text-2xl font-bold m-0">Propiedad Intelectual</h2>
                                </div>
                                <p>Livio retiene todos los derechos sobre software, IA, logos y código. Te otorgamos licencia no exclusiva para uso interno. Tus Datos Clínicos son tuyos.</p>
                            </section>

                            <section id="datos-clinicos">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">7</span>
                                    <h2 className="text-2xl font-bold m-0">Datos Clínicos y Cumplimiento</h2>
                                </div>
                                <p>HCE con trazabilidad y firma digital OTP. Cumplimos Ley 27.706 y Ley de Protección de Datos Personales. No somos responsables de diagnósticos o errores médicos.</p>
                            </section>

                            <section id="garantias">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">8</span>
                                    <h2 className="text-2xl font-bold m-0">Garantías y Disponibilidad</h2>
                                </div>
                                <p>Servicio "tal cual", con un compromiso de 99% de tiempo de actividad (uptime). Sin garantías de ininterrupción absoluta o ausencia total de errores.</p>
                            </section>

                            <section id="responsabilidad">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">9</span>
                                    <h2 className="text-2xl font-bold m-0">Limitación de Responsabilidad</h2>
                                </div>
                                <p>No responsables de daños indirectos o no-shows. Límite máximo de responsabilidad: Monto pagado en los 12 meses previos ($1.188.000 ARS máx.).</p>
                            </section>

                            <section id="terminacion">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">11</span>
                                    <h2 className="text-2xl font-bold m-0">Terminación</h2>
                                </div>
                                <p>Puedes cancelar desde el dashboard en cualquier momento. Nosotros podemos dar por terminado el servicio por impago o abuso con aviso previo de 7 días.</p>
                            </section>

                            <section id="disputas">
                                <div className="flex items-center gap-3 mb-6 font-display text-slate-900 dark:text-white">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-[#5cb99a] font-bold border border-accent/20">13</span>
                                    <h2 className="text-2xl font-bold m-0">Resolución de Disputas</h2>
                                </div>
                                <p>Gobernado por las leyes de la República Argentina. Jurisdicción exclusiva de los tribunales de la Ciudad Autónoma de Buenos Aires.</p>
                            </section>
                        </div>

                        <div className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">¿Deseas una copia de estos términos?</p>
                                <p className="text-slate-900 dark:text-white font-bold text-lg">support@livio.ar</p>
                            </div>
                            <button className="bg-accent hover:bg-[#5cb99a] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-accent/20">
                                Descargar Términos
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
