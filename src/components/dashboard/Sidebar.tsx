"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    Users,
    UserX,
    FileText,
    FileBarChart,
    Settings,
    LogOut,
    User as UserIcon,
    ChevronUp,
    MessageSquare,
    ChevronsLeft,
    ChevronsRight,
    Moon,
    Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrialBadge } from "./TrialBadge";
import { useSidebar } from "@/providers/sidebar-provider";
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
        title: "WhatsApp",
        href: "/chat",
        icon: MessageSquare,
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
    const { user, loading: authLoading, signOut } = useAuth();
    const { collapsed, toggle } = useSidebar();
    const { theme, setTheme } = useTheme();

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const userInitial = (user as any)?.full_name?.charAt(0) || user?.email?.charAt(0) || "?";

    if (!isMounted) return null;

    return (
        <aside
            className={cn(
                "hidden h-screen flex-col border-r bg-white dark:bg-slate-950 text-slate-900 dark:text-white md:flex fixed left-0 top-0 z-50 overflow-hidden transition-all duration-300",
                collapsed ? "w-20" : "w-64"
            )}
        >
            {/* Logo + toggle */}
            {collapsed ? (
                <div className="border-b flex flex-col items-center justify-center gap-2 py-3 shrink-0">
                    <Image
                        src="/logo peuqueño.png"
                        alt="Livio"
                        width={36}
                        height={36}
                        className="h-9 w-auto object-contain"
                        priority
                    />
                    <button
                        onClick={toggle}
                        className="rounded-md p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-400 transition-colors"
                        aria-label="Expandir sidebar"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div className="border-b relative flex items-center justify-center px-4 py-3 shrink-0">
                    <Image
                        src="/logo-transparent.png"
                        alt="Livio"
                        width={180}
                        height={72}
                        className="h-12 w-auto object-contain"
                        priority
                    />
                    <button
                        onClick={toggle}
                        className="absolute right-3 rounded-md p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-400 transition-colors"
                        aria-label="Minimizar sidebar"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>
                </div>
            )}

            <nav className={cn("flex-1 space-y-1 p-2", !collapsed && "p-4")}>
                {sidebarItems.filter((item) => {
                    if (!user?.role) return true;
                    if (user.role === 'recepcionista') {
                        return ["Dashboard", "Agenda", "Pacientes", "WhatsApp"].includes(item.title);
                    }
                    if (user.role === 'profesional') {
                        return ["Dashboard", "Agenda", "Pacientes", "Historia Clínica"].includes(item.title);
                    }
                    return true;
                }).map((item) => {
                    const isActive = pathname === item.href ||
                        pathname.startsWith(item.href + "/") ||
                        (item.href === "/historia-clinica" && pathname.includes("historia-clinica"));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.title : undefined}
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                                collapsed ? "justify-center gap-0" : "gap-3",
                                isActive
                                    ? "bg-accent/10 text-accent"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900 hover:text-slate-900 dark:text-white dark:hover:text-white"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-6 w-6 flex-shrink-0",
                                    isActive ? "text-accent" : "text-slate-400 dark:text-slate-500 dark:text-slate-400 group-hover:text-slate-500 dark:text-slate-400"
                                )}
                            />
                            {!collapsed && item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* Trial / Upgrade Badge */}
            <div className={collapsed ? "px-2" : "px-4"}>
                <TrialBadge collapsed={collapsed} />
            </div>

            {/* Profile Footer */}
            <div className={cn("border-t mt-auto", collapsed ? "p-2" : "p-4")}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            "flex w-full items-center rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900 text-left outline-none group",
                            collapsed ? "justify-center" : "gap-3"
                        )}>
                            <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-accent/20 transition-all shrink-0">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-accent/10 text-accent font-bold">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                            {!collapsed && (
                                <>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {authLoading && !user
                                                ? <span className="inline-block w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                                : ((user as any)?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "Usuario")}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {user?.email}
                                        </p>
                                    </div>
                                    <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                                </>
                            )}
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
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                            <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950" onClick={() => signOut()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
