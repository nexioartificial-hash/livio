"use client";

// HeroBackground Component (Now acting as Global Fluid Background)
// Implements a "Wave Gradient" effect that covers the entire viewport.
// Strategy: Skewed gradient moving horizontally to simulate a passing wave.
// Colors: White -> Mint (#A5ECCE) -> Blue (#C5DDFF) -> White.

export default function HeroBackground() {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden bg-white pointer-events-none">
            <style jsx>{`
                @keyframes wave-flow {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
            `}</style>

            {/* 
                Large gradient background.
                125deg skew creates a diagonal "wave" front.
                background-size 300% allows for long smooth transitions.
            */}
            <div
                className="absolute inset-0 opacity-60"
                style={{
                    background: 'linear-gradient(125deg, #ffffff 0%, #E0ECFF 30%, #D9FBEA 50%, #ffffff 70%, #C5DDFF 100%)',
                    backgroundSize: '300% 300%',
                    animation: 'wave-flow 15s ease infinite alternate'
                }}
            />

            {/* Optional: Second layer moving slightly different speed for depth? 
                Keeping it simple first as requested: "una ola gradiente". 
            */}
        </div>
    );
}
