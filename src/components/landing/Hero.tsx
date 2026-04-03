import { Button } from "@/components/ui/button";
import { Check, PlayCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Hero() {
    return (
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    <div className="flex flex-col gap-8 text-left px-2 sm:px-0">
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-5xl xl:text-[3.4rem] leading-[1.15]">
                            Software con <span className="relative inline-block">
                                IA
                                <svg className="absolute w-full h-3 -bottom-2 left-0 text-accent" viewBox="0 0 100 20" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                                    <path d="M4 4 Q 50 18 96 4" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                                </svg>
                            </span>
                            <br />
                            para tu clínica dental
                        </h1>

                        <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
                            Optimiza tu agenda, automatiza recordatorios y controla tu facturación con la plataforma líder en Argentina diseñada específicamente para odontólogos.
                        </p>

                        <div className="flex flex-col gap-4 max-w-md">
                            <div className="flex items-center gap-3">
                                <Check className="h-6 w-6 text-accent shrink-0" strokeWidth={3} />
                                <span className="text-primary font-medium">Reduce el ausentismo de pacientes hasta un 40%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Check className="h-6 w-6 text-accent shrink-0" strokeWidth={3} />
                                <span className="text-primary font-medium">Facturación automática y reportes inteligentes</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Check className="h-6 w-6 text-accent shrink-0" strokeWidth={3} />
                                <span className="text-primary font-medium">Historias clínicas digitales 100% seguras</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-6 items-stretch sm:items-center sm:justify-start max-w-lg">
                            <Button size="xl" className="bg-accent text-primary hover:bg-accent/90 font-bold text-base shadow-[0_4px_14px_0_rgba(130,217,188,0.39)] rounded-lg h-auto py-4 px-6 text-center" asChild>
                                <Link href="/register">
                                    Comenzar prueba gratuita de 30 días
                                </Link>
                            </Button>
                            <Button size="xl" variant="outline" className="border-2 border-secondary hover:bg-secondary/20 hover:text-primary font-semibold text-base rounded-lg h-auto py-4 px-6 group text-center justify-center" asChild>
                                <Link href="/#how-it-works" className="flex items-center justify-center">
                                    <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Ver cómo funciona
                                </Link>
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground font-medium">
                            *No requiere tarjeta de crédito. Cancelación en cualquier momento.
                        </p>
                    </div>

                    {/* Dashboard Screenshot */}
                    <div className="relative w-full lg:w-[115%] lg:-mr-[15%]" aria-hidden="true">
                        <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 via-accent/10 to-transparent rounded-3xl transform rotate-1 scale-110 blur-3xl -z-10"></div>
                        <div className="relative rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden border border-secondary/40 animate-float">
                            <Image
                                src="/dashboard-real.png"
                                alt="Dashboard de Livio - Vista general con turnos, KPIs e indicadores"
                                width={1280}
                                height={800}
                                className="w-full h-auto object-cover"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
