import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import ForWhom from "@/components/landing/ForWhom";
import Benefits from "@/components/landing/Benefits";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Results from "@/components/landing/Results";
import Pricing from "@/components/landing/Pricing";
import Trust from "@/components/landing/Trust";
import Footer from "@/components/landing/Footer";
import HeroBackground from "@/components/landing/HeroBackground";
import Image from "next/image";

export default function LandingPage() {
    return (
        <main className="flex min-h-screen flex-col items-center bg-transparent relative selection:bg-accent/30 z-10">
            <HeroBackground />
            <Header />
            <Hero />
            <ForWhom />
            <Benefits />
            <HowItWorks />
            <Features />
            <Results />
            <Pricing />
            <Trust />
            <Footer />
        </main>
    );
}
