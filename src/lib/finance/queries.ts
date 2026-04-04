import { SupabaseClient } from "@supabase/supabase-js";

export interface DailyFinanceData {
    failedPayments: { clinic_name: string; amount: number | null; created_at: string; details: Record<string, unknown> | null }[];
    cancelations: { clinic_name: string; canceled_at: string }[];
    trialsExpiringSoon: { clinic_name: string; trial_ends_at: string }[];
    newCustomers: { clinic_name: string; amount: number | null; created_at: string }[];
    activeSubscriptionCount: number;
}

export interface MonthlyFinanceData {
    startActiveCount: number;
    endActiveCount: number;
    cancelationCount: number;
    newPaidCount: number;
    newTrialCount: number;
    totalRevenue: number;
    failedPaymentCount: number;
    movements: { clinic_name: string; event_type: string; amount: number | null; created_at: string }[];
}

/** Fetch data for the daily finance report (last 24 hours) */
export async function getDailyFinanceData(supabase: SupabaseClient): Promise<DailyFinanceData> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Failed payments in last 24h
    const { data: failedRaw } = await supabase
        .from("payment_history")
        .select("clinic_id, amount, created_at, details")
        .neq("status", "approved")
        .neq("status", "authorized")
        .gte("created_at", since);

    // Cancelations in last 24h
    const { data: cancelRaw } = await supabase
        .from("subscriptions")
        .select("clinica_id, updated_at")
        .eq("status", "canceled")
        .gte("updated_at", since);

    // Trials expiring in next 48h
    const { data: trialsRaw } = await supabase
        .from("subscriptions")
        .select("clinica_id, trial_ends_at")
        .eq("status", "trialing")
        .lte("trial_ends_at", tomorrow)
        .gte("trial_ends_at", now);

    // New customers (subscription_authorized) in last 24h
    const { data: newCustRaw } = await supabase
        .from("payment_history")
        .select("clinic_id, amount, created_at")
        .eq("event_type", "subscription_authorized")
        .gte("created_at", since);

    // Active subscription count
    const { count: activeCount } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

    // Resolve clinic names
    const clinicIds = new Set<string>();
    failedRaw?.forEach((r) => clinicIds.add(r.clinic_id));
    cancelRaw?.forEach((r) => clinicIds.add(r.clinica_id));
    trialsRaw?.forEach((r) => clinicIds.add(r.clinica_id));
    newCustRaw?.forEach((r) => clinicIds.add(r.clinic_id));

    const clinicNames = await resolveClinicNames(supabase, Array.from(clinicIds));

    return {
        failedPayments: (failedRaw ?? []).map((r) => ({
            clinic_name: clinicNames[r.clinic_id] ?? "Clínica desconocida",
            amount: r.amount,
            created_at: r.created_at,
            details: r.details as Record<string, unknown> | null,
        })),
        cancelations: (cancelRaw ?? []).map((r) => ({
            clinic_name: clinicNames[r.clinica_id] ?? "Clínica desconocida",
            canceled_at: r.updated_at,
        })),
        trialsExpiringSoon: (trialsRaw ?? []).map((r) => ({
            clinic_name: clinicNames[r.clinica_id] ?? "Clínica desconocida",
            trial_ends_at: r.trial_ends_at,
        })),
        newCustomers: (newCustRaw ?? []).map((r) => ({
            clinic_name: clinicNames[r.clinic_id] ?? "Clínica desconocida",
            amount: r.amount,
            created_at: r.created_at,
        })),
        activeSubscriptionCount: activeCount ?? 0,
    };
}

/** Fetch data for the monthly finance report */
export async function getMonthlyFinanceData(supabase: SupabaseClient, year: number, month: number): Promise<MonthlyFinanceData> {
    const startOfMonth = new Date(year, month - 1, 1).toISOString();
    const endOfMonth = new Date(year, month, 1).toISOString();

    const { count: startActive } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lte("created_at", startOfMonth);

    const { count: endActive } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lte("created_at", endOfMonth);

    const { count: cancelCount } = await supabase
        .from("payment_history")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "subscription_cancelled")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);

    const { count: newPaid } = await supabase
        .from("payment_history")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "subscription_authorized")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);

    const { count: newTrials } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "trialing")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);

    const { data: revenueData } = await supabase
        .from("payment_history")
        .select("amount")
        .eq("status", "approved")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);

    const totalRevenue = (revenueData ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);

    const { count: failedCount } = await supabase
        .from("payment_history")
        .select("id", { count: "exact", head: true })
        .neq("status", "approved")
        .neq("status", "authorized")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);

    const { data: movementsRaw } = await supabase
        .from("payment_history")
        .select("clinic_id, event_type, amount, created_at")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth)
        .order("created_at", { ascending: false });

    const clinicIds = [...new Set((movementsRaw ?? []).map((m) => m.clinic_id))];
    const clinicNames = await resolveClinicNames(supabase, clinicIds);

    return {
        startActiveCount: startActive ?? 0,
        endActiveCount: endActive ?? 0,
        cancelationCount: cancelCount ?? 0,
        newPaidCount: newPaid ?? 0,
        newTrialCount: newTrials ?? 0,
        totalRevenue,
        failedPaymentCount: failedCount ?? 0,
        movements: (movementsRaw ?? []).map((m) => ({
            clinic_name: clinicNames[m.clinic_id] ?? "Clínica desconocida",
            event_type: m.event_type,
            amount: m.amount,
            created_at: m.created_at,
        })),
    };
}

/** Helper: resolve clinic IDs to names */
async function resolveClinicNames(supabase: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) return {};
    const { data } = await supabase
        .from("clinic")
        .select("id, name")
        .in("id", ids);
    const map: Record<string, string> = {};
    (data ?? []).forEach((c) => { map[c.id] = c.name; });
    return map;
}
