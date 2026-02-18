import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";

export default function Pricing() {
    return (
        <section className="container mx-auto px-4 py-12 md:py-24 bg-transparent" id="pricing">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Planes simples, pensados para crecer
                </h2>
            </div>

            <div className="grid gap-8 lg:grid-cols-3 items-start">
                {/* Plan Básico */}
                <Card className="flex flex-col h-full bg-white/40 backdrop-blur-sm border-secondary/20">
                    <CardHeader>
                        <CardTitle className="text-xl">Plan Básico</CardTitle>
                        <CardDescription>Consultorios 1–2 boxes</CardDescription>
                        <div className="mt-4">
                            <span className="text-4xl font-bold">USD 90</span>
                            <span className="text-muted-foreground">/ mes</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> 1 sucursal
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Hasta 3 profesionales
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Agenda y Pacientes
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Recordatorios
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Historia Clínica
                            </li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" variant="outline" asChild>
                            <Link href="/signup">Comenzar prueba gratis</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Plan Profesional */}
                <Card className="flex flex-col h-full border-accent shadow-lg relative bg-white/60 backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-accent hover:bg-accent/90 text-accent-foreground px-3 py-1 text-sm">Recomendado</Badge>
                    </div>
                    <CardHeader>
                        <CardTitle className="text-xl text-primary">Plan Profesional</CardTitle>
                        <CardDescription>Clínicas 3–10 boxes</CardDescription>
                        <div className="mt-4">
                            <span className="text-4xl font-bold">USD 250</span>
                            <span className="text-muted-foreground">/ mes</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Hasta 5 sucursales
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Profesionales ilimitados
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> <strong>Chatbot IA</strong> (24/7)
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> CRM de Ventas
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Dashboard Avanzado
                            </li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                            <Link href="/signup?plan=pro">Comenzar prueba gratis</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Plan Enterprise */}
                <Card className="flex flex-col h-full bg-white/40 backdrop-blur-sm border-none">
                    <CardHeader>
                        <CardTitle className="text-xl">Plan Enterprise</CardTitle>
                        <CardDescription>Redes de clínicas</CardDescription>
                        <div className="mt-4">
                            <span className="text-muted-foreground text-sm">Desde</span>
                            <div className="text-4xl font-bold">USD 600</div>
                            <span className="text-muted-foreground">/ mes</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Personalizado
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Multi-marca
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Acceso a API
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Soporte Prioritario
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-accent" /> Onboarding in-situ
                            </li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" variant="outline" asChild>
                            <Link href="/contact">Contactar ventas</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="mt-12 text-center">
                <Button size="lg" className="px-8 text-lg" asChild>
                    <Link href="/signup">
                        Comenzar prueba gratis de 14 días
                    </Link>
                </Button>
            </div>
        </section>
    );
}
