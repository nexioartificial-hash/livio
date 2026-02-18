"use client";

import dynamic from "next/dynamic";

const OnboardingWizard = dynamic(
    () => import("@/components/onboarding/OnboardingWizard"),
    { ssr: false }
);

export default function OnboardingPage() {
    return (
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-12">
            <OnboardingWizard />
        </div>
    );
}
