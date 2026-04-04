import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyFinanceData } from "@/lib/finance/queries";
import { calcMRR, formatARS } from "@/lib/finance/metrics";
import { sendDailyFinanceReport } from "@/lib/email/send";
import { DateTime } from "luxon";

const TIMEZONE = "America/Argentina/Buenos_Aires";

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportEmail = process.env.FINANCE_REPORT_EMAIL ?? "admin@liviodental.com";

    try {
        const supabase = createAdminClient();
        const data = await getDailyFinanceData(supabase);

        const mrr = calcMRR(data.activeSubscriptionCount);
        const dateLabel = DateTime.now().setZone(TIMEZONE).setLocale("es").toLocaleString(DateTime.DATE_FULL);

        const result = await sendDailyFinanceReport(
            reportEmail,
            dateLabel,
            formatARS(mrr),
            data.activeSubscriptionCount,
            data.failedPayments.map((p) => ({
                clinic_name: p.clinic_name,
                amount: formatARS(p.amount ?? 0),
                created_at: DateTime.fromISO(p.created_at).setZone(TIMEZONE).toLocaleString(DateTime.DATETIME_SHORT, { locale: "es-AR" }),
            })),
            data.cancelations.map((c) => ({
                clinic_name: c.clinic_name,
                canceled_at: DateTime.fromISO(c.canceled_at).setZone(TIMEZONE).toLocaleString(DateTime.DATE_SHORT, { locale: "es-AR" }),
            })),
            data.trialsExpiringSoon.map((t) => ({
                clinic_name: t.clinic_name,
                trial_ends_at: DateTime.fromISO(t.trial_ends_at).setZone(TIMEZONE).toLocaleString(DateTime.DATE_SHORT, { locale: "es-AR" }),
            })),
            data.newCustomers.map((n) => ({
                clinic_name: n.clinic_name,
                amount: formatARS(n.amount ?? 0),
                created_at: DateTime.fromISO(n.created_at).setZone(TIMEZONE).toLocaleString(DateTime.DATETIME_SHORT, { locale: "es-AR" }),
            })),
        );

        console.log(`[Finance Daily] Report sent to ${reportEmail}: ${result.success ? "OK" : result.error}`);
        return NextResponse.json({ success: result.success, email: reportEmail });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Finance Daily] Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
