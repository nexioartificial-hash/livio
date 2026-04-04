const PLAN_PRICE_ARS = 99_000;

/** MRR = active subscriptions × plan price */
export function calcMRR(activeCount: number): number {
    return activeCount * PLAN_PRICE_ARS;
}

/** ARR = MRR × 12 */
export function calcARR(mrr: number): number {
    return mrr * 12;
}

/** Churn rate = cancelations / active at start of period × 100 */
export function calcChurnRate(cancelations: number, startActive: number): number {
    if (startActive === 0) return 0;
    return (cancelations / startActive) * 100;
}

/** Trial → Paid conversion = new paid / new trials × 100 */
export function calcTrialConversion(newPaid: number, newTrials: number): number {
    if (newTrials === 0) return 0;
    return (newPaid / newTrials) * 100;
}

/** LTV = average MRR per customer / monthly churn rate (as decimal) */
export function calcLTV(avgMRRPerCustomer: number, monthlyChurnPercent: number): number {
    if (monthlyChurnPercent === 0) return 0;
    return avgMRRPerCustomer / (monthlyChurnPercent / 100);
}

/** Format ARS currency */
export function formatARS(amount: number): string {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
}

export { PLAN_PRICE_ARS };
