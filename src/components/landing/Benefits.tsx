import { CheckCircle2 } from "lucide-react";

export default function Benefits() {
    return (
        <section className="container mx-auto px-4 py-12 md:py-24 bg-transparent">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Un beneficio claro para cada rol de la clínica
                </h2>
            </div>

            <div className="grid gap-12 md:grid-cols-3">
                {/* Dueño */}
                <div className="space-y-4">
                    <div className="inline-block rounded-lg bg-secondary/40 px-3 py-1 text-sm text-foreground font-semibold mb-2">Dueño / Director</div>
                    <h3 className="text-2xl font-bold">Control total del negocio</h3>
                    <ul className="space-y-3 text-muted-foreground">
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Dashboard en tiempo real: facturación estimada, producción por profesional, no-shows y ocupación.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Sabés exactamente cuántos leads llegaron y cuántos se convirtieron en pacientes.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Tomás decisiones con datos, no con intuición.</span>
                        </li>
                    </ul>
                </div>

                {/* Recepción */}
                <div className="space-y-4">
                    <div className="inline-block rounded-lg bg-accent/20 px-3 py-1 text-sm text-foreground font-semibold mb-2">Recepción / Admin</div>
                    <h3 className="text-2xl font-bold">Adiós al caos de WhatsApp</h3>
                    <ul className="space-y-3 text-muted-foreground">
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Un solo inbox para todos los mensajes de WhatsApp y web.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>El chatbot responde y agenda turnos solo; vos solo manejás excepciones.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Menos llamadas, menos planillas, menos estrés.</span>
                        </li>
                    </ul>
                </div>

                {/* Profesional */}
                <div className="space-y-4">
                    <div className="inline-block rounded-lg bg-secondary/40 px-3 py-1 text-sm text-foreground font-semibold mb-2">Profesional Odontólogo/a</div>
                    <h3 className="text-2xl font-bold">Historia clínica simple y completa</h3>
                    <ul className="space-y-3 text-muted-foreground">
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Historia clínica electrónica completa en 3 clics, con odontograma interactivo.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Notas de evolución, adjuntos (radiografías, consentimientos) y firma digital.</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                            <span>Todo trazable, sin papeles y listo para auditorías.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
