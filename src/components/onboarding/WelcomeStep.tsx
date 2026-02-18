"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import ReactConfetti from "react-confetti";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface WelcomeStepProps {
    onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [showConfetti, setShowConfetti] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleSkip = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Check if profile exists
                const { data: existing } = await supabase
                    .from('professional')
                    .select('id')
                    .eq('id', user.id)
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('professional')
                        .update({ is_onboarded: true, role: 'superadmin' })
                        .eq('id', user.id);
                } else {
                    await supabase
                        .from('professional')
                        .insert({ id: user.id, is_onboarded: true, role: 'superadmin' });
                }
            }
        } catch (e) {
            console.error('Skip onboarding error:', e);
        }
        router.replace("/dashboard");
        router.refresh();
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-5 text-center space-y-2">
            {showConfetti && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} gravity={0.1} />}

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative w-24 h-24 flex items-center justify-center mb-0"
            >
                <div className="relative w-full h-full translate-x-[28%]">
                    <Image
                        src="/logo peuqueño.png"
                        alt="Livio - Software con IA para clínicas odontológicas"
                        fill
                        className="object-contain mix-blend-multiply"
                        priority
                    />
                </div>
            </motion.div>

            <div className="space-y-2 max-w-xl flex flex-col items-center">
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-bold text-slate-800 tracking-tight leading-tight flex flex-row items-center justify-center gap-0.5 whitespace-nowrap"
                >
                    <span>¡Bienvenido a</span>
                    <div className="relative w-28 h-10 self-center translate-y-[2px]">
                        <Image
                            src="/logo.png"
                            alt="Livio"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span>!</span>
                </motion.h1>
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-slate-500 text-lg font-medium px-4 text-center max-w-lg"
                >
                    Configuramos tu clínica en minutos paso a paso.
                    <br />
                    Diseñado para simplificar tu práctica diaria.
                </motion.p>
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-4 w-full justify-center pt-4 items-center"
            >
                <Button
                    onClick={onNext}
                    className="h-14 px-10 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm gap-2 shadow-lg shadow-[#10B981]/20 hover:shadow-xl transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2"
                >
                    Empezar ahora <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="h-12 px-8 rounded-xl text-slate-400 font-medium text-sm hover:bg-slate-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
                >
                    Saltar y configurar después
                </Button>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                transition={{ delay: 0.8 }}
                className="text-[10px] text-slate-300 font-medium uppercase tracking-[0.2em] pt-8"
            >
                Potenciado por IA odontológica
            </motion.p>
        </div>
    );
}
