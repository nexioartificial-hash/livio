import { Button } from "@/components/ui/button";
import { Check, PlayCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Hero() {
    return (
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">


            {/* Background blobs - REMOVING old manual blobs to avoid conflict */}

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">

                    <div className="flex flex-col gap-8 text-left pl-4 lg:pl-0">


                        <h1 className="text-4xl font-extrabold tracking-tight text-[#111827] sm:text-5xl lg:text-5xl xl:text-[3.4rem] leading-[1.15]">
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

                        <div className="flex flex-col sm:flex-row gap-4 pt-6 justify-start">
                            <Button size="xl" className="bg-accent text-primary hover:bg-accent/90 font-bold text-base shadow-[0_4px_14px_0_rgba(130,217,188,0.39)] rounded-lg h-auto py-4 px-8" asChild>
                                <Link href="/register">
                                    Comenzar prueba gratis 14 días
                                </Link>
                            </Button>
                            <Button size="xl" variant="outline" className="border-2 border-secondary hover:bg-secondary/20 hover:text-primary font-semibold text-base rounded-lg h-auto py-4 px-8 group" asChild>
                                <Link href="#how-it-works" className="flex items-center">
                                    <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Ver cómo funciona
                                </Link>
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground font-medium">
                            *No requiere tarjeta de crédito. Cancelación en cualquier momento.
                        </p>
                    </div>

                    {/* Desktop Mockup */}
                    <div className="relative w-full perspective-1000">
                        <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent rounded-3xl transform rotate-2 scale-105 blur-2xl -z-10"></div>
                        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-secondary transform transition-transform hover:scale-[1.01] duration-500">
                            {/* Header Mockup */}
                            <div className="bg-white border-b border-muted px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-md text-xs px-3 py-1 text-slate-500 font-medium flex items-center gap-2">
                                    🔒 livio.app/dashboard
                                </div>
                                <div className="w-7 h-7 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">DR</div>
                            </div>

                            <div className="flex h-[400px]">
                                {/* Sidebar */}
                                <div className="w-16 bg-white border-r border-muted flex flex-col items-center py-6 gap-6">
                                    <div className="p-2.5 rounded-lg bg-primary text-white shadow-lg shadow-slate-200">
                                        <div className="h-5 w-5 bg-current" style={{ maskImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z\"/></svg>')", maskSize: "cover" }} />
                                    </div>
                                    <div className="h-5 w-5 bg-slate-400 opacity-50 rounded"></div>
                                    <div className="h-5 w-5 bg-slate-400 opacity-50 rounded"></div>
                                    <div className="h-5 w-5 bg-slate-400 opacity-50 rounded"></div>
                                </div>

                                {/* Dashboard Content */}
                                <div className="flex-1 bg-slate-50/50 p-6 flex flex-col gap-6 overflow-hidden relative">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl border border-muted shadow-sm">
                                            <div className="text-xs font-medium text-slate-500 mb-1">Pacientes Hoy</div>
                                            <div className="flex items-end justify-between">
                                                <span className="text-2xl font-bold text-primary">12</span>
                                                <span className="text-xs font-semibold text-primary bg-accent/30 px-2 py-0.5 rounded-full">+2 vs ayer</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-muted shadow-sm">
                                            <div className="text-xs font-medium text-slate-500 mb-1">Ingresos Semanales</div>
                                            <div className="flex items-end justify-between">
                                                <span className="text-2xl font-bold text-primary">$480k</span>
                                                <span className="text-xs font-semibold text-primary bg-accent/30 px-2 py-0.5 rounded-full">+15%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calendar Area Mockup */}
                                    <div className="bg-white rounded-xl border border-muted shadow-sm flex-1 p-4 relative overflow-hidden">
                                        <div className="flex justify-between items-center mb-4 border-b border-muted pb-2">
                                            <div className="text-sm font-semibold text-primary">Agenda - 24 Octubre</div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-4">
                                                <div className="text-xs text-slate-400 w-10 py-2">09:00</div>
                                                <div className="flex-1 bg-accent/10 border-l-4 border-accent p-2 rounded-r-md">
                                                    <div className="text-sm font-semibold text-primary">Juan Pérez</div>
                                                    <div className="text-xs text-slate-500">Limpieza Dental</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="text-xs text-slate-400 w-10 py-2">10:30</div>
                                                <div className="flex-1 bg-primary/5 border-l-4 border-primary p-2 rounded-r-md">
                                                    <div className="text-sm font-semibold text-primary">Maria Gonzalez</div>
                                                    <div className="text-xs text-slate-500">Ortodoncia</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Badge */}
                            <div className="absolute bottom-6 left-6 bg-white p-3 rounded-xl shadow-xl border border-muted flex items-center gap-3 animate-bounce">
                                <div className="bg-accent/20 p-2 rounded-full text-primary">
                                    <span className="text-xl">💰</span>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Facturación Octubre</div>
                                    <div className="text-sm font-bold text-primary">Objetivo alcanzado 🚀</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
