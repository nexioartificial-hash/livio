import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function Features() {
    return (
        <section className="container mx-auto px-4 py-12 md:py-24 bg-transparent">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Todo lo que tu clínica necesita en un solo lugar
                </h2>
            </div>

            <div className="grid gap-12 lg:grid-cols-3">
                {/* Gestión y agenda */}
                <div className="space-y-6 p-6 border border-secondary/20 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white/40 backdrop-blur-sm">
                    <Badge variant="outline" className="w-fit text-base px-3 py-1 border-secondary/50 text-foreground">Gestión y Agenda</Badge>
                    <ul className="space-y-4 list-none">
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Agenda visual por profesional y sucursal.</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Estados de turno: pendiente, confirmado, no-show, cancelado.</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Recordatorios automáticos por WhatsApp, SMS y email.</span>
                        </li>
                    </ul>
                </div>

                {/* IA y crecimiento */}
                <div className="space-y-6 p-6 border-2 border-accent/30 rounded-xl shadow-md bg-white/60 backdrop-blur-sm">
                    <Badge className="w-fit text-base px-3 py-1 bg-accent text-accent-foreground hover:bg-accent/90">IA y Crecimiento</Badge>
                    <ul className="space-y-4 list-none">
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Chatbot omnicanal 24/7 que responde consultas y agenda turnos.</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Pipeline de ventas simple para seguir leads hasta conversión.</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Dashboard: no-shows, nuevos leads, producción por profesional.</span>
                        </li>
                    </ul>
                </div>

                {/* Clínico y cumplimiento */}
                <div className="space-y-6 p-6 border border-secondary/20 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white/40 backdrop-blur-sm">
                    <Badge variant="outline" className="w-fit text-base px-3 py-1 border-secondary/50 text-foreground">Clínico y Normativa</Badge>
                    <ul className="space-y-4 list-none">
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>H.C.E. alineada con Ley 27.706 (trazabilidad, backups).</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Odontograma interactivo y registro de tratamientos.</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-accent shrink-0" />
                            <span>Firma digital del profesional y acceso futuro del paciente.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
