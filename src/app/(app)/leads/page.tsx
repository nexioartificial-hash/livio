"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const columns = [
    {
        title: "Nuevo", color: "bg-slate-100", items: [
            { name: "María López", source: "Instagram", date: "Hoy" },
            { name: "Carlos Ruiz", source: "Google Ads", date: "Ayer" },
        ]
    },
    {
        title: "Contactado", color: "bg-blue-50", items: [
            { name: "Ana García", source: "WhatsApp", date: "Hace 2d" },
        ]
    },
    {
        title: "Turno Agendado", color: "bg-yellow-50", items: [
            { name: "Pedro Martínez", source: "Referido", date: "15/10" },
            { name: "Lucía Fernández", source: "Web", date: "18/10" },
        ]
    },
    {
        title: "Paciente", color: "bg-green-50", items: [
            { name: "Juan Pérez", source: "Referido", date: "01/10" },
        ]
    },
];

export default function LeadsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900">Leads CRM</h1>
                <button className="rounded-lg bg-[#76D7B6] px-4 py-2 text-sm font-bold text-slate-900 hover:bg-[#65cba8] transition-colors">
                    + Nuevo Lead
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {columns.map((col) => (
                    <div key={col.title} className={`rounded-xl p-4 ${col.color} min-h-[400px]`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-700">{col.title}</h3>
                            <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {col.items.map((item, i) => (
                                <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow bg-white">
                                    <CardContent className="p-4">
                                        <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-slate-500">{item.source}</span>
                                            <span className="text-xs text-slate-400">{item.date}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
