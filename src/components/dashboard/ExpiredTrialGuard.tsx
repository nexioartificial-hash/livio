"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Lock, Rocket, Loader2, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function ExpiredTrialGuard({ children }: { children: React.ReactNode }) {
    const { isTrialExpired, isPro, startCheckout, isCheckoutLoading, loading } = useSubscription();

    // If still loading subscription, just show children or a small loader
    if (loading) return children;

    // If not expired or is pro, show everything normally
    if (!isTrialExpired || isPro) return children;

    return (
        <div className="relative min-h-screen">
            {/* Blurry Background Content */}
            <div className="pointer-events-none select-none blur-[6px] opacity-30 transition-all duration-700">
                {children}
            </div>

            {/* Expired Overlay with Restored Blur */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    className="bg-white dark:bg-slate-950 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] w-full max-w-[360px] overflow-hidden relative flex flex-col items-center text-center pb-9"
                >
                    {/* Progress Bar Decoration */}
                    <div className="w-full bg-gray-100 h-1.5 flex mb-6">
                        <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-1.5 w-full animate-[progress_2s_ease-in-out]"></div>
                    </div>

                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] -mt-5 mb-7">
                        Prueba: 100% Completada
                    </div>

                    {/* Custom Lock Illustration (Medium-Small Scale) */}
                    <div className="relative w-24 h-24 mb-5 flex flex-col items-center justify-center scale-[0.85]">
                        <div
                            className="w-12 h-14 border-[5px] border-gray-300 rounded-t-full border-b-0 absolute top-2 z-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]"
                            style={{
                                background: "linear-gradient(180deg, #e5e7eb 0%, #d1d5db 100%)",
                                top: isCheckoutLoading ? "4px" : "2px",
                                transition: "all 0.3s ease"
                            }}
                        />
                        <div className="w-16 h-14 rounded-2xl bg-gradient-to-br from-emerald-100/90 to-teal-200/70 border border-white/60 backdrop-blur-md shadow-[0_8px_16px_rgba(16,185,129,0.2)] absolute bottom-2 z-10 flex flex-col items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-teal-500 shadow-sm relative z-20"></div>
                            <div className="w-1.5 h-3 bg-teal-500 rounded-sm -mt-1 relative z-10"></div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tighter px-8 leading-tight">
                        Tu prueba gratuita ha finalizado
                    </h2>

                    <p className="text-gray-500 text-[13px] leading-relaxed mb-8 px-10">
                        Los 30 días de prueba terminaron y para seguir gestionando la clínica es necesario actualizar a <span className="font-bold text-teal-600 underline decoration-teal-300/40 underline-offset-4">Livio PRO</span>.
                    </p>

                    <div className="w-full px-10 mb-7">
                        <button
                            onClick={startCheckout}
                            disabled={isCheckoutLoading}
                            className={cn(
                                "w-full bg-[linear-gradient(to_right,#10b981,#14b8a6)] hover:opacity-95 active:scale-95 transition-all duration-300 text-white font-black text-sm py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(20,184,166,0.2)] hover:-translate-y-1 group disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest",
                            )}
                        >
                            {isCheckoutLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                            ) : (
                                <>
                                    ACTUALIZAR A PRO
                                    <Zap className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-col items-center w-full px-10">
                        <div className="flex items-center w-full justify-center mb-5">
                            <div className="flex-grow h-px bg-gray-100"></div>
                            <span className="px-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
                                Pago Seguro
                            </span>
                            <div className="flex-grow h-px bg-gray-100"></div>
                        </div>

                        <div className="flex items-center justify-center gap-3 opacity-50 grayscale transition-opacity">
                            <img src="/logo mp.png" alt="Mercado Pago" className="h-4 object-contain" />
                            <div className="w-px h-5 bg-gray-100 mx-0.5" />
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Protegido</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <style jsx global>{`
                @keyframes progress {
                    from { width: 0; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
}
