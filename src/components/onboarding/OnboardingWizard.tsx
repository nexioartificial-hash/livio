"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import WelcomeStep from "./WelcomeStep";
import ClinicStep from "./ClinicStep";
import StaffStep from "./StaffStep";
import ImportStep from "./ImportStep";
import BulkHistoryStep from "./BulkHistoryStep";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function OnboardingWizard() {
    const [step, setStep] = useState(1);
    const totalSteps = 5;

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const renderStep = () => {
        switch (step) {
            case 1: return <WelcomeStep onNext={nextStep} />;
            case 2: return <ClinicStep onNext={nextStep} onBack={prevStep} />;
            case 3: return <StaffStep onNext={nextStep} onBack={prevStep} />;
            case 4: return <ImportStep onNext={nextStep} onBack={prevStep} />;
            case 5: return <BulkHistoryStep onBack={prevStep} />;
            default: return null;
        }
    };

    return (
        <div className="w-full max-w-4xl bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] overflow-hidden min-h-[420px] max-h-full flex flex-col" style={{ boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.1)' }}>
            {/* Header / Progress */}
            {step > 1 && (
                <div className="p-8 pb-0 flex flex-col items-center">
                    <div className="relative w-32 h-10 mb-4">
                        <Image
                            src="/logo.png"
                            alt="Livio"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-4 px-4 overflow-hidden">
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div
                                        key={i}
                                        className={`h-2 w-12 rounded-full transition-all duration-500 ${i <= step ? "bg-[#76D7B6]" : "bg-slate-200"
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-bold text-slate-400">Paso {step} de {totalSteps}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "anticipate" }}
                        className="h-full"
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
