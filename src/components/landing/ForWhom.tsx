import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";


export default function ForWhom() {
    return (
        <section className="container mx-auto px-4 py-12 md:py-24 bg-white/20 backdrop-blur-sm rounded-3xl my-8 border border-white/20">
            <div className="text-center mb-12 space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl flex items-center justify-center gap-3">
                    ¿Para quién es <Image src="/logo-transparent.png" alt="Livio" width={180} height={60} className="h-8 sm:h-10 md:h-12 w-auto object-contain inline-block relative top-1" />?
                </h2>
                <p className="text-xl text-muted-foreground mx-auto max-w-[800px]">
                    Livio está pensado para clínicas odontológicas que ya crecieron y ahora necesitan orden, métricas y menos caos en recepción.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-white/40 hover:bg-white/60 transition-colors border-white/30">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-primary">Clínicas en crecimiento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <h3 className="font-semibold text-lg">Estás abriendo tu segunda sucursal o creciendo en boxes.</h3>
                        <ul className="text-muted-foreground text-sm space-y-2 mt-4">
                            <li>• Necesitás centralizar agenda, pacientes y facturación en un solo lugar.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="bg-white/40 hover:bg-white/60 transition-colors border-white/30">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-primary">Clínicas con WhatsApp caótico</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <h3 className="font-semibold text-lg">Recepción responde cientos de mensajes por día y se pierden consultas.</h3>
                        <ul className="text-muted-foreground text-sm space-y-2 mt-4">
                            <li>• No sabés cuántos leads llegan ni cuántos turnos se pierden por falta de seguimiento.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="bg-white/40 hover:bg-white/60 transition-colors border-white/30">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-primary">Clínicas que quieren cumplir HCE</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <h3 className="font-semibold text-lg">Te preocupa cumplir con la Historia Clínica Electrónica (Ley 27.706).</h3>
                        <ul className="text-muted-foreground text-sm space-y-2 mt-4">
                            <li>• Querés dejar atrás el papel y tener todo trazable, firmado y respaldado.</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
