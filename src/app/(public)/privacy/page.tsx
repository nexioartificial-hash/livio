import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
    title: "Política de Privacidad | Livio",
    description: "Cumplimos PDPA (Ley 25.326) y Ley 27.706 de Historia Clínica Electrónica.",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 selection:bg-[#1E3A8A]/10">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group transition-all">
                        <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors">
                            <ChevronLeft className="h-5 w-5 text-slate-600" />
                        </div>
                        <Image
                            src="/logo.png"
                            alt="Livio"
                            width={100}
                            height={32}
                            className="h-8 w-auto object-contain"
                        />
                    </Link>
                    <div className="hidden md:block">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#1E3A8A] bg-[#1E3A8A]/5 px-3 py-1 rounded-full">
                            Seguridad de Datos
                        </span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black text-[#1E3A8A] tracking-tight">
                        Política de Privacidad
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Vigente desde: <span className="text-slate-900">3 de marzo de 2026</span>
                    </p>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-10 space-y-8">
                    <div className="prose prose-slate max-w-none">
                        <p className="text-slate-600 leading-relaxed italic border-l-4 border-[#1E3A8A] pl-4">
                            Livio ('nosotros', 'nuestro' o 'Livio'), con CUIT 27443913721, es responsable del tratamiento de datos personales en livio.ar. Cumplimos Ley 25.326 (PDPA) y Ley 27.706 (HCE).
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                1. Datos Recopilados
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 space-y-4 pt-2">
                                <p><span className="font-bold text-slate-800">Personales:</span> Nombre, DNI, fecha nacimiento, teléfono, email, dirección, obra social.</p>
                                <p><span className="font-bold text-slate-800">Clínicos (sensibles):</span> Antecedentes, diagnóstico, plan tratamiento, odontograma, evolución, adjuntos (radiografías).</p>
                                <p><span className="font-bold text-slate-800">Comerciales:</span> Leads (motivo consulta, pipeline), historial turnos/agenda.</p>
                                <p><span className="font-bold text-slate-800">Técnicos:</span> IP, logs auditoría, cookies (analíticas esenciales), datos WhatsApp Business API.</p>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                2. Finalidad
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                Gestión clínica (agenda, recordatorios, HCE trazable), CRM (leads, chatbot IA), facturación, soporte. No marketing sin consentimiento.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                3. Base Legal
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                Consentimiento explícito (checkbox registro/onboarding). Interés legítimo para logs/auditoría. Obligación legal (Ley 27.706).
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                4. Compartir Datos
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                Solo proveedores seguros (Supabase PostgreSQL cifrado, WhatsApp Meta, OpenAI GPT-4o con DPA). No ventas ni transferencias fuera Argentina sin safeguards. Subprocesadores listados en config.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                5. Derechos ARCO+
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 space-y-4 pt-2 text-base">
                                <p><span className="font-bold text-slate-800">Acceso:</span> Ver tus datos.</p>
                                <p><span className="font-bold text-slate-800">Rectificación:</span> Corregir inexactitudes.</p>
                                <p><span className="font-bold text-slate-800 text-base">Oposición/Cancelación:</span> Limitar/eliminar (salvo legal).</p>
                                <p><span className="font-bold text-slate-800 text-base">Portabilidad:</span> Exportar formato estructurado.</p>
                                <p className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                                    Solicita a <a href="mailto:privacidad@livio.ar" className="text-[#1E3A8A] font-bold">privacidad@livio.ar</a> (respuesta ≤30 días). Reclamos a AAIP: <a href="http://www.argentina.gob.ar/aaip" target="_blank" className="text-[#1E3A8A] hover:underline">www.argentina.gob.ar/aaip</a>.
                                </p>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-6" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                6. Seguridad
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                RLS Supabase, backups diarios cifrados, 2FA, auditoría completa (tabla AuditoriaLog), firma digital OTP. Brechas notifiedas ≤72h.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-7" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                7. Cookies
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                Esenciales (sesión), analíticas (Google Analytics opt-out). Configura navegador.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-8" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                8. Retención
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                Activos: Mientras servicio + 5 años fiscales. Suprimir post-cancelación (anonimizar leads).
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-9" className="border-slate-100 py-2">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                9. Menores
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                No procesamos datos menores sin consentimiento parental verificado.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-10" className="border-slate-100 py-2 border-none">
                            <AccordionTrigger className="text-lg font-bold text-slate-900 hover:text-[#1E3A8A] hover:no-underline transition-colors">
                                10. Cambios
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-600 pt-2 leading-relaxed text-base">
                                Notificamos por email/app. Revisión anual.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="pt-8 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm font-medium">
                            Contacto: <a href="mailto:soporte@liviodental.com" className="text-[#1E3A8A] font-bold">soporte@liviodental.com</a> | AAIP para quejas.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-slate-200">
                <div className="container mx-auto px-4 text-center space-y-4">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Última actualización: Marzo 2026 | Contacto: soporte@liviodental.com
                    </p>
                    <Link href="/" className="inline-block opacity-50 hover:opacity-100 transition-opacity">
                        <Image
                            src="/logo.png"
                            alt="Livio"
                            width={80}
                            height={24}
                            className="h-6 w-auto grayscale"
                        />
                    </Link>
                </div>
            </footer>
        </div>
    );
}
