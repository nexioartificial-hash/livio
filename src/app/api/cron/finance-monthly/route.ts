import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMonthlyFinanceData } from "@/lib/finance/queries";
import { calcMRR, calcARR, calcChurnRate, calcTrialConversion, calcLTV, formatARS, PLAN_PRICE_ARS } from "@/lib/finance/metrics";
import { sendMonthlyFinanceReport } from "@/lib/email/send";
import { DateTime } from "luxon";

const TIMEZONE = "America/Argentina/Buenos_Aires";

const EVENT_LABELS: Record<string, string> = {
    subscription_authorized: "Suscripción activada",
    subscription_paused: "Suscripción pausada",
    subscription_cancelled: "Cancelación",
    payment_approved: "Pago mensual",
};

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportEmail = process.env.FINANCE_REPORT_EMAIL ?? "admin@liviodental.com";

    try {
        const supabase = createAdminClient();

        const lastMonth = DateTime.now().setZone(TIMEZONE).minus({ months: 1 });
        const year = lastMonth.year;
        const month = lastMonth.month;
        const monthLabel = lastMonth.setLocale("es").toFormat("MMMM yyyy");

        const data = await getMonthlyFinanceData(supabase, year, month);

        const mrrStart = calcMRR(data.startActiveCount);
        const mrrEnd = calcMRR(data.endActiveCount);
        const mrrChangePercent = mrrStart === 0 ? 0 : ((mrrEnd - mrrStart) / mrrStart) * 100;
        const arr = calcARR(mrrEnd);
        const churnRate = calcChurnRate(data.cancelationCount, data.startActiveCount);
        const trialConversion = calcTrialConversion(data.newPaidCount, data.newTrialCount);
        const ltv = calcLTV(PLAN_PRICE_ARS, churnRate);

        const result = await sendMonthlyFinanceReport(
            reportEmail,
            monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            formatARS(mrrStart),
            formatARS(mrrEnd),
            `${mrrChangePercent >= 0 ? "+" : ""}${mrrChangePercent.toFixed(1)}%`,
            formatARS(arr),
            `${churnRate.toFixed(1)}%`,
            `${trialConversion.toFixed(1)}%`,
            formatARS(ltv),
            formatARS(data.totalRevenue),
            data.failedPaymentCount,
            data.startActiveCount,
            data.endActiveCount,
            data.cancelationCount,
            data.newPaidCount,
            data.movements.map((m) => ({
                clinic_name: m.clinic_name,
                event_label: EVENT_LABELS[m.event_type] ?? m.event_type,
                amount: formatARS(m.amount ?? 0),
                date: DateTime.fromISO(m.created_at).setZone(TIMEZONE).toLocaleString(DateTime.DATE_SHORT, { locale: "es-AR" }),
            })),
        );

        console.log(`[Finance Monthly] Report sent to ${reportEmail}: ${result.success ? "OK" : result.error}`);
        return NextResponse.json({ success: result.success, email: reportEmail, month: monthLabel });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Finance Monthly] Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
