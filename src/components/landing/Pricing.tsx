"use client";

import { useAuth } from "@/providers/auth-provider";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NextImage from "next/image";

export default function Pricing() {
    const { user } = useAuth();
    const { isPro, startCheckout, isCheckoutLoading } = useSubscription();
    const router = useRouter();

    const proCTA = !user
        ? "COMENZAR TRIAL GRATIS"
        : isPro
            ? "PLAN PRO ACTIVO"
            : isCheckoutLoading
                ? "PROCESANDO..."
                : "ACTIVAR PRO AHORA";

    const handleProClick = () => {
        if (!user) return router.push("/register");
        if (isPro) return;
        startCheckout();
    };

    return (
        <section className="container mx-auto px-4 py-8 md:py-16 bg-transparent" id="pricing">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                    Planes simples, pensados para crecer
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                    Nada de mil planes confusos. La solución digital para tu clínica es UNA SOLA.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3 items-stretch max-w-6xl mx-auto">
                {/* Plan Trial / Inicio */}
                <div>
                    <Card className="flex flex-col h-full bg-white dark:bg-slate-950/40 dark:bg-slate-900/40 backdrop-blur-sm border-slate-200 dark:border-slate-700/50 dark:border-slate-700/50 hover:border-accent/30 transition-all group">
                        <CardHeader className="py-5">
                            <CardTitle className="text-lg font-bold">Prueba Gratis</CardTitle>
                            <CardDescription className="text-xs">Para empezar hoy mismo</CardDescription>
                            <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-900 dark:text-white">$0</span>
                                <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[9px]">ARS / 30 DÍAS</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-4">
                            <ul className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" /> Todas las funciones PRO
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" /> Sin tarjetas de crédito
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" /> Onboarding inicial
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" /> Soporte vía Chat
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter className="pb-6">
                            <Button className="w-full font-bold h-10" variant="outline" asChild>
                                <Link href="/register">
                                    Empezar
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Plan PRO (Principal) */}
                <div className="relative">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-accent hover:bg-accent/90 text-slate-900 dark:text-white font-black px-4 py-1 text-xs uppercase tracking-wider shadow-lg border-none">
                            MÁS COMPLETO
                        </Badge>
                    </div>
                    <Card className="flex flex-col h-full border-accent shadow-2xl relative bg-white dark:bg-slate-950 ring-2 ring-accent/20">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 pt-4 pb-2 flex flex-col items-center">
                            <NextImage
                                src="/logo-transparent.png"
                                alt="Livio Logo"
                                width={180}
                                height={60}
                                className="h-12 w-auto object-contain mb-1"
                            />
                            <CardDescription className="text-slate-600 dark:text-slate-400 font-bold text-sm">La solución completa sin límites</CardDescription>
                            <div className="mt-1 flex flex-col items-center">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">$99.000</span>
                                <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-widest mt-0">ARS / MES</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 pt-2 pb-2">
                            <ul className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <li className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-accent" /> Agenda IA + WhatsApp Automático
                                </li>
                                <li className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-accent" /> CRM de Leads + Chatbot
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" /> Historia Clínica Electrónica (Ley)
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" /> Pacientes y Turnos Ilimitados
                                </li>
                                <li className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-accent" /> Soporte WhatsApp 24h
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-accent" /> Clínicas y Profesionales Ilimitados
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter className="pb-4 pt-0">
                            <Button
                                onClick={handleProClick}
                                disabled={isPro || isCheckoutLoading}
                                className="w-full bg-accent hover:bg-accent/90 text-slate-900 dark:text-white font-bold h-10 shadow-lg text-sm"
                            >
                                {proCTA}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Plan Enterprise */}
                <div>
                    <Card className="flex flex-col h-full bg-white dark:bg-slate-950/40 dark:bg-slate-900/40 backdrop-blur-sm border-slate-200 dark:border-slate-700/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                        <CardHeader className="py-5">
                            <CardTitle className="text-lg font-bold">Enterprise</CardTitle>
                            <CardDescription className="text-xs">Para redes de clínicas</CardDescription>
                            <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Personalizado</div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-3">
                            <ul className="space-y-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-slate-400" /> Múltiples RUCs/Sedes
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-slate-400" /> Onboarding in-situ
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-slate-400" /> Acceso a Reportes Custom
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-slate-400" /> Account Manager
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter className="pb-6">
                            <Button className="w-full font-bold h-10" variant="outline" asChild>
                                <Link href="https://wa.me/your-number">Contacto</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <div className="mt-16 text-center">
                <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-accent" /> Sin comisiones ocultas • Cancela cuando quieras
                </p>
            </div>
        </section>
    );
}
