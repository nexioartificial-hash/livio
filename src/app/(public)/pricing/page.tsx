import Pricing from "@/components/landing/Pricing";

export const metadata = {
    title: "Planes y Precios | Livio",
    description: "Planes simples y transparentes para potenciar tu clínica dental.",
};

export default function PricingPage() {
    return (
        <main className="min-h-screen pt-24 pb-12">
            <div className="container mx-auto px-4">
                <Pricing />
            </div>
        </main>
    );
}
