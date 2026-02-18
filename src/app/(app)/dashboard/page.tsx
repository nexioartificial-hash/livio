export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Bienvenido a Livio. Selecciona un paciente o revisa tu agenda.</p>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700">Pacientes Hoy</h3>
                    <p className="text-3xl font-bold text-primary mt-2">8</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700">Próximo Turno</h3>
                    <p className="text-xl font-medium text-slate-900 mt-2">10:30 AM</p>
                    <p className="text-sm text-slate-500">Juan Pérez - Consulta</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700">Ingresos Mes</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">$2.4M</p>
                </div>
            </div>
        </div>
    );
}
