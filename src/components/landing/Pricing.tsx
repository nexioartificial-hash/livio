"use client";

import { useAuth } from "@/providers/auth-provider";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Zap, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import NextImage from "next/image";

export default function Pricing() {
    const { user } = useAuth();
    const { isPro } = useSubscription();

    const handleRegisterRedirect = () => {
        window.location.href = "/register";
    };

    const proCTA = !user
        ? "COMENZAR TRIAL GRATIS"
        : isPro
            ? "PLAN PRO ACTIVO"
            : "ACTIVAR PRO AHORA";

    return (
        <section className="container mx-auto px-4 py-8 md:py-16 bg-transparent" id="pricing">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
            >
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                    Planes simples, pensados para crecer
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto font-medium">
                    Nada de mil planes confusos. La solución digital para tu clínica es UNA SOLA.
                </p>
            </motion.div>

            <div className="grid gap-8 lg:grid-cols-3 items-stretch max-w-6xl mx-auto">
                {/* Plan Trial / Inicio */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="flex flex-col h-full bg-white/40 backdrop-blur-sm border-slate-200/50 hover:border-[#76D7B6]/30 transition-all group">
                        <CardHeader className="py-5">
                            <CardTitle className="text-lg font-bold">Prueba Gratis</CardTitle>
                            <CardDescription className="text-xs">Para empezar hoy mismo</CardDescription>
                            <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-900">$0</span>
                                <span className="text-slate-500 font-semibold uppercase text-[9px]">ARS / 30 DÍAS</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-4">
                            <ul className="space-y-2 text-sm font-medium text-slate-600">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-[#76D7B6]" /> Todas las funciones PRO
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-[#76D7B6]" /> Sin tarjetas de crédito
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-[#76D7B6]" /> Onboarding inicial
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-[#76D7B6]" /> Soporte vía Chat
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
                </motion.div>

                {/* Plan PRO (Principal) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative"
                >
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-black px-4 py-1 text-xs uppercase tracking-wider shadow-lg border-none">
                            MÁS COMPLETO
                        </Badge>
                    </div>
                    <Card className="flex flex-col h-full border-[#76D7B6] shadow-2xl relative bg-white ring-2 ring-[#76D7B6]/20">
                        <CardHeader className="bg-slate-50/50 pt-4 pb-2 flex flex-col items-center">
                            <NextImage
                                src="/logo-transparent.png"
                                alt="Livio Logo"
                                width={180}
                                height={60}
                                className="h-12 w-auto object-contain mb-1"
                            />
                            <CardDescription className="text-slate-600 font-bold text-sm">La solución completa sin límites</CardDescription>
                            <div className="mt-1 flex flex-col items-center">
                                <span className="text-4xl font-bold text-slate-900">$99.000</span>
                                <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-widest mt-0">ARS / MES</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 pt-2 pb-2">
                            <ul className="space-y-1 text-sm font-semibold text-slate-700">
                                <li className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-[#76D7B6]" /> Agenda IA + WhatsApp Automático
                                </li>
                                <li className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-[#76D7B6]" /> CRM de Leads + Chatbot
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-[#76D7B6]" /> Historia Clínica Electrónica (Ley)
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-[#76D7B6]" /> Pacientes y Turnos Ilimitados
                                </li>
                                <li className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-[#76D7B6]" /> Soporte WhatsApp 24h
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-[#76D7B6]" /> Clínicas y Profesionales Ilimitados
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter className="pb-4 pt-0">
                            <Button
                                onClick={handleRegisterRedirect}
                                className="w-full bg-[#76D7B6] hover:bg-[#65cba8] text-slate-900 font-bold h-10 shadow-lg text-sm"
                            >
                                {proCTA}
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>

                {/* Plan Enterprise */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="flex flex-col h-full bg-white/40 backdrop-blur-sm border-slate-200/50 hover:border-slate-300 transition-all">
                        <CardHeader className="py-5">
                            <CardTitle className="text-lg font-bold">Enterprise</CardTitle>
                            <CardDescription className="text-xs">Para redes de clínicas</CardDescription>
                            <div className="mt-1 text-xl font-bold text-slate-900">Personalizado</div>
                        </CardHeader>
                        <CardContent className="flex-1 pb-3">
                            <ul className="space-y-1.5 text-xs font-medium text-slate-600">
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
                </motion.div>
            </div>

            <div className="mt-16 text-center">
                <p className="text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-[#76D7B6]" /> Sin comisiones ocultas • Cancela cuando quieras
                </p>
            </div>
        </section>
    );
}
