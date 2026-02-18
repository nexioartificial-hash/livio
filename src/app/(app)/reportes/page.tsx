"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const revenueData = [
    { month: "Ene", ingresos: 1200000 },
    { month: "Feb", ingresos: 1450000 },
    { month: "Mar", ingresos: 1380000 },
    { month: "Abr", ingresos: 1620000 },
    { month: "May", ingresos: 1900000 },
    { month: "Jun", ingresos: 2100000 },
    { month: "Jul", ingresos: 1850000 },
    { month: "Ago", ingresos: 2400000 },
];

const patientsData = [
    { month: "Ene", nuevos: 12, recurrentes: 45 },
    { month: "Feb", nuevos: 18, recurrentes: 48 },
    { month: "Mar", nuevos: 15, recurrentes: 52 },
    { month: "Abr", nuevos: 22, recurrentes: 50 },
    { month: "May", nuevos: 28, recurrentes: 55 },
    { month: "Jun", nuevos: 25, recurrentes: 60 },
];

const treatmentData = [
    { name: "Limpieza", value: 35 },
    { name: "Ortodoncia", value: 25 },
    { name: "Endodoncia", value: 15 },
    { name: "Implantes", value: 12 },
    { name: "Estética", value: 13 },
];

const COLORS = ["#76D7B6", "#4ECDC4", "#45B7AA", "#2D9CDB", "#6C63FF"];

export default function ReportesPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Reportes</h1>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Ingresos Mes</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">$2.4M</p>
                        <p className="text-xs text-green-600 mt-1">+14% vs mes anterior</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Pacientes Atendidos</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">85</p>
                        <p className="text-xs text-green-600 mt-1">+8% vs mes anterior</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Turnos Cancelados</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">7</p>
                        <p className="text-xs text-red-500 mt-1">8.2% ratio</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Ticket Promedio</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">$28.2K</p>
                        <p className="text-xs text-green-600 mt-1">+5% vs mes anterior</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Ingresos Mensuales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Ingresos"]} />
                                <Bar dataKey="ingresos" fill="#76D7B6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Pacientes por Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={patientsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="nuevos" stroke="#76D7B6" strokeWidth={2} dot={{ r: 4 }} name="Nuevos" />
                                <Line type="monotone" dataKey="recurrentes" stroke="#2D9CDB" strokeWidth={2} dot={{ r: 4 }} name="Recurrentes" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">Tratamientos Realizados</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={treatmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                                    {treatmentData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
