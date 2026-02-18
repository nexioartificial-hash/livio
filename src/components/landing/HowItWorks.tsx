
import Image from "next/image";

export default function HowItWorks() {
    const steps = [
        {
            number: "1",
            title: "El paciente escribe",
            description: "El paciente escribe por WhatsApp o desde la web consultando por un turno.",
        },
        {
            number: "2",
            title: "IA en acción",
            description: "Livio detecta la intención, crea el lead y ofrece horarios disponibles automáticamente.",
        },
        {
            number: "3",
            title: "Turno confirmado",
            description: "Cuando el paciente elige, el turno se crea en tu agenda y se bloquea el horario.",
        },
        {
            number: "4",
            title: "Seguimiento",
            description: "24h antes, Livio envía recordatorio. Todo queda registrado en la historia clínica.",
        },
    ];

    return (
        <section id="how-it-works" className="container mx-auto px-4 py-12 md:py-24 bg-white/20 backdrop-blur-sm rounded-3xl my-8 border border-white/20">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl flex items-center justify-center gap-3 flex-wrap">
                    Cómo funciona <Image src="/logo-transparent.png" alt="Livio" width={180} height={60} className="h-8 sm:h-10 md:h-12 w-auto object-contain inline-block relative top-1" /> en tu día a día
                </h2>
                <p className="text-xl text-muted-foreground mt-4 max-w-[800px] mx-auto">
                    De la consulta por WhatsApp al turno confirmado y registrado en la historia clínica, en pocos pasos.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => (
                    <div key={step.number} className="relative flex flex-col items-center text-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-lg">
                            {step.number}
                        </div>
                        <h3 className="text-xl font-bold">{step.title}</h3>
                        <p className="text-muted-foreground">{step.description}</p>
                    </div>
                ))}
            </div>
            {/* Dashboard Preview */}
            <div className="mt-16 relative w-full maxim-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-secondary/20">
                <Image
                    src="/dashboard-mockup.png"
                    alt="Livio Dashboard Preview"
                    width={1200}
                    height={800}
                    className="w-full h-auto object-cover"
                />
            </div>
        </section>
    );
}
