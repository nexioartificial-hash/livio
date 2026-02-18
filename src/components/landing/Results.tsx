import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Wallet } from "lucide-react";

export default function Results() {
    return (
        <section className="container mx-auto px-4 py-12 md:py-24 bg-muted/50 rounded-3xl my-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Resultados que importan al negocio
                </h2>
                <p className="text-xl text-muted-foreground mt-4 max-w-[800px] mx-auto">
                    Livio está diseñado para clínicas con facturación mensual entre ARS 5M y 20M, donde cada turno perdido impacta directo en el resultado del mes.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-background border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Ausentismo
                        </CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-40%</div>
                        <p className="text-xs text-muted-foreground">
                            Menos ausentismo con recordatorios automáticos
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-background border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Nuevos Turnos
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+20/mes</div>
                        <p className="text-xs text-muted-foreground">
                            Solo por ordenar WhatsApp y seguir leads
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-background border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Retorno de Inversión
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">10x</div>
                        <p className="text-xs text-muted-foreground">
                            El sistema se paga solo recuperando no-shows
                        </p>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
