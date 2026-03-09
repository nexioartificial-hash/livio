"use client";

import { useAuth } from "@/providers/auth-provider";
import {
    Bell,
    Search,
    User,
    Settings,
    LogOut,
    Menu,
    Package,
    AlertTriangle,
    CalendarX
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getInventario } from "@/app/actions/inventario";
import { differenceInDays } from "date-fns";

interface AlertaNotif {
    id: string;
    tipo: "vencimiento" | "stock";
    mensaje: string;
    producto: string;
    dias?: number;
}

export function Header() {
    const { user, signOut } = useAuth();
    const [alertas, setAlertas] = useState<AlertaNotif[]>([]);

    // Initial for avatar if no photo
    const userInitial = user?.full_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "?";

    useEffect(() => {
        const clinicId = (user as any)?.clinic_id;
        if (!clinicId) return;

        getInventario(clinicId).then((res) => {
            if (!res.success || !res.data) return;

            const hoy = new Date();
            const nuevasAlertas: AlertaNotif[] = [];

            res.data.forEach((item: any) => {
                // Alerta de vencimiento próximo (≤ 10 días)
                if (item.vencimiento) {
                    const dias = differenceInDays(new Date(item.vencimiento), hoy);
                    if (dias >= 0 && dias <= 10) {
                        nuevasAlertas.push({
                            id: `venc-${item.id}`,
                            tipo: "vencimiento",
                            producto: item.producto,
                            mensaje: dias === 0 ? "Vence hoy" : `Vence en ${dias} día${dias === 1 ? "" : "s"}`,
                            dias,
                        });
                    }
                }

                // Alerta de stock bajo
                if (item.stock_actual <= item.stock_min) {
                    nuevasAlertas.push({
                        id: `stock-${item.id}`,
                        tipo: "stock",
                        producto: item.producto,
                        mensaje: `Stock bajo: ${item.stock_actual} unidades (mín. ${item.stock_min})`,
                    });
                }
            });

            // Ordenar: vencimientos primero, luego stock bajo
            nuevasAlertas.sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999));
            setAlertas(nuevasAlertas);
        });
    }, [user]);

    return (
        <header className="sticky top-0 z-40 bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm">
            {/* Left: Search (Desktop) / Menu (Mobile) */}
            <div className="flex items-center gap-4 flex-1">
                <div className="relative max-w-sm w-full hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar pacientes..."
                        className="pl-9 h-9 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-[#76D7B6]"
                    />
                </div>
                {/* Mobile text logo or icon */}
                <div className="md:hidden font-bold text-xl text-[#76D7B6]">Livio</div>
            </div>

            {/* Right: Notifications & Profile */}
            <div className="flex items-center gap-2 md:gap-4">
                {user?.role && (
                    <Badge variant="outline" className={cn(
                        "hidden sm:flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border",
                        user.role === 'superadmin' ? "bg-slate-900 text-white border-slate-900" :
                            user.role === 'recepcionista' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-[#76D7B6]/10 text-[#76D7B6] border-[#76D7B6]/30"
                    )}>
                        {user.role === 'superadmin' ? 'Dueño' : user.role === 'recepcionista' ? 'Recepción' : 'Dentista'}
                    </Badge>
                )}

                {/* Notification Bell */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-[#76D7B6]">
                            <Bell className="h-5 w-5" />
                            {alertas.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full border-2 border-white leading-none">
                                    {alertas.length > 9 ? "9+" : alertas.length}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden rounded-xl shadow-xl border border-slate-100">
                        <div className="bg-gradient-to-r from-indigo-950 to-indigo-800 p-4">
                            <p className="text-white font-bold text-sm">Notificaciones</p>
                            <p className="text-indigo-300 text-xs mt-0.5">
                                {alertas.length === 0 ? "Todo en orden" : `${alertas.length} alerta${alertas.length === 1 ? "" : "s"} activa${alertas.length === 1 ? "" : "s"}`}
                            </p>
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                            {alertas.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                                    <Bell className="h-6 w-6 text-slate-200" />
                                    <p className="text-sm">Sin alertas activas</p>
                                </div>
                            ) : (
                                alertas.map((alerta) => (
                                    <div key={alerta.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className={cn(
                                            "mt-0.5 shrink-0 rounded-full p-1.5",
                                            alerta.tipo === "vencimiento"
                                                ? "bg-orange-100 text-orange-600"
                                                : "bg-red-100 text-red-600"
                                        )}>
                                            {alerta.tipo === "vencimiento"
                                                ? <CalendarX className="h-3.5 w-3.5" />
                                                : <Package className="h-3.5 w-3.5" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{alerta.producto}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{alerta.mensaje}</p>
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-1",
                                            alerta.tipo === "vencimiento"
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-red-100 text-red-700"
                                        )}>
                                            {alerta.tipo === "vencimiento" ? "Vto." : "Stock"}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {alertas.length > 0 && (
                            <div className="p-3 border-t border-slate-100 bg-slate-50">
                                <Link href="/config?tab=inventario">
                                    <button className="w-full text-xs font-semibold text-[#76D7B6] hover:text-[#5fc0a0] text-center transition-colors">
                                        Ver todo el Inventario →
                                    </button>
                                </Link>
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-2 hover:ring-2 hover:ring-[#76D7B6]/20 transition-all">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-bold">
                                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "?"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuario"}</p>
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    {user?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuario"}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/config">
                            <DropdownMenuItem className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>Mi Perfil</span>
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/config">
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configuración</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => signOut()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
