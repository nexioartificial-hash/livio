"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    Users,
    UserX,
    MessageCircle,
    FileText,
    FileBarChart,
    Settings,
    LogOut,
    User as UserIcon,
    ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Agenda",
        href: "/agenda",
        icon: Calendar,
    },
    {
        title: "Pacientes",
        href: "/pacientes",
        icon: Users,
    },
    {
        title: "Leads CRM",
        href: "/leads",
        icon: UserX,
    },
    {
        title: "Chat",
        href: "/chat",
        icon: MessageCircle,
    },
    {
        title: "Historia Clínica",
        href: "/historia-clinica",
        icon: FileText,
    },
    {
        title: "Reportes",
        href: "/reportes",
        icon: FileBarChart,
    },
    {
        title: "Configuración",
        href: "/config",
        icon: Settings,
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, signOut } = useAuth();

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Mock trial days remaining
    const trialDaysLeft = 14;

    const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "?";

    if (!isMounted) return null; // Avoid hydration mismatch on IDs

    return (
        <aside className="hidden h-screen w-64 flex-col border-r bg-white text-slate-900 md:flex fixed left-0 top-0 z-50 overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-center">
                <Image
                    src="/logo-transparent.png"
                    alt="Livio"
                    width={100}
                    height={40}
                    className="h-8 w-auto object-contain"
                    priority
                />
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {sidebarItems.filter((item) => {
                    if (!user?.role) return true; // Default to showing all if loading or no role

                    if (user.role === 'recepcionista') {
                        return ["Dashboard", "Agenda", "Pacientes", "Chat"].includes(item.title);
                    }
                    if (user.role === 'profesional') {
                        return ["Dashboard", "Agenda", "Pacientes", "Historia Clínica"].includes(item.title);
                    }
                    return true; // Superadmin sees all
                }).map((item) => {
                    const isActive = pathname === item.href ||
                        pathname.startsWith(item.href + "/") ||
                        (item.href === "/historia-clinica" && pathname.includes("historia-clinica"));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-[#76D7B6]/10 text-[#76D7B6]"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-5 w-5 flex-shrink-0",
                                    isActive ? "text-[#76D7B6]" : "text-slate-400 group-hover:text-slate-500"
                                )}
                            />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* Trial / Upgrade Badge */}
            <div className="px-4 pb-4">
                <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-lg">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#76D7B6]">TRIAL ACTIVO</span>
                        <span className="text-xs text-slate-400">{trialDaysLeft}d</span>
                    </div>
                    <p className="mb-3 text-xs text-slate-300">
                        Tienes acceso total. Actualiza para mantener tus datos.
                    </p>
                    <button className="w-full rounded-lg bg-[#76D7B6] py-2 text-xs font-bold text-slate-900 hover:bg-[#65cba8] transition-colors">
                        UPGRADE PRO
                    </button>
                </div>
            </div>

            {/* Profile Footer */}
            <div className="p-4 border-t mt-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 text-left outline-none group">
                            <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-[#76D7B6]/20 transition-all">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-bold">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    {user?.user_metadata?.full_name || "Dr. Usuario"}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mb-2" align="start" side="top" forceMount>
                        <Link href="/config">
                            <DropdownMenuItem className="cursor-pointer">
                                <UserIcon className="mr-2 h-4 w-4" />
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
        </aside>
    );
}
