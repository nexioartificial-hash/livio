"use client";

import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";

export default function DashboardPage() {
    const { user } = useAuth();
    const supabase = createClient();
    const [stats, setStats] = useState({
        patientsToday: 0,
        nextAppointment: { time: "--:--", patient: "Sin turnos" },
        monthlyRevenue: "$0.0M"
    });

    useEffect(() => {
        if (!user?.clinic_id) return;

        const fetchStats = async () => {
            const today = DateTime.now().toISODate();

            // 1. Patients today
            const { count: patientsToday } = await supabase
                .from('turno')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', user.clinic_id)
                .eq('date', today);

            // 2. Next appointment
            // First, try to find an appointment later today
            let { data: nextAppt, error: nextError } = await supabase
                .from('turno')
                .select('time, patient_name')
                .eq('clinic_id', user.clinic_id)
                .eq('date', today)
                .gte('time', DateTime.now().toFormat('HH:mm'))
                .order('time', { ascending: true })
                .limit(1)
                .maybeSingle();

            // If no more today, find the first one in the future
            if (!nextAppt && !nextError) {
                const { data: futureAppt } = await supabase
                    .from('turno')
                    .select('time, patient_name')
                    .eq('clinic_id', user.clinic_id)
                    .gt('date', today)
                    .order('date', { ascending: true })
                    .order('time', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                nextAppt = futureAppt;
            }

            setStats({
                patientsToday: patientsToday || 0,
                nextAppointment: nextAppt ? {
                    time: nextAppt.time.substring(0, 5),
                    patient: nextAppt.patient_name
                } : { time: "--:--", patient: "Sin turnos" },
                monthlyRevenue: "$0.0M" // Placeholder for now as payment logic is complex
            });
        };

        fetchStats();
    }, [user?.clinic_id, supabase]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Bienvenido a Livio. Selecciona un paciente o revisa tu agenda.</p>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700">Pacientes Hoy</h3>
                    <p className="text-3xl font-bold text-[#76D7B6] mt-2">{stats.patientsToday}</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700">Próximo Turno</h3>
                    <p className="text-xl font-medium text-slate-900 mt-2">{stats.nextAppointment.time}</p>
                    <p className="text-sm text-slate-500">{stats.nextAppointment.patient}</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700">Ingresos Mes</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats.monthlyRevenue}</p>
                </div>
            </div>
        </div>
    );
}
