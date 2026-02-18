import { ShieldCheck } from "lucide-react";

export default function Trust() {
    return (
        <section className="container mx-auto px-4 py-12 md:py-24 bg-muted/30 rounded-3xl my-8">
            <div className="flex flex-col md:flex-row gap-12 items-center">
                <div className="flex-1 space-y-6">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                        Hecho en Argentina, listo para Ley 27.706
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        Livio nace específicamente para la realidad de las clínicas odontológicas argentinas: integra IA conversacional, cumple con los requisitos técnicos de la Historia Clínica Electrónica y se adapta a tu forma actual de trabajar.
                    </p>
                </div>

                <div className="flex-1">
                    <ul className="space-y-4">
                        <li className="flex gap-4 p-4 bg-background rounded-xl shadow-sm border">
                            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                            <div>
                                <h3 className="font-bold">Infraestructura en la nube</h3>
                                <p className="text-sm text-muted-foreground">Backups automáticos diarios y seguridad de nivel bancario.</p>
                            </div>
                        </li>
                        <li className="flex gap-4 p-4 bg-background rounded-xl shadow-sm border">
                            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                            <div>
                                <h3 className="font-bold">Trazabilidad completa</h3>
                                <p className="text-sm text-muted-foreground">Registro inalterable de quién modifica qué y cuándo.</p>
                            </div>
                        </li>
                        <li className="flex gap-4 p-4 bg-background rounded-xl shadow-sm border">
                            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                            <div>
                                <h3 className="font-bold">Soporte humano</h3>
                                <p className="text-sm text-muted-foreground">Ayuda por WhatsApp durante el onboarding y migración.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
