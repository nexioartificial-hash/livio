"use client";

import { useAuth } from "@/providers/auth-provider";
import {
    Bell,
    Search,
    User,
    Settings,
    LogOut,
    CheckCheck,
    CalendarClock,
    Package,
    UserPlus,
    AlertTriangle,
    Info,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuItem,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/providers/notifications-provider";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { seedNotifications } from "@/app/actions/notifications";
import { toast } from "sonner";

const TYPE_CONFIG = {
    agenda: {
        icon: CalendarClock,
        color: "text-blue-600",
        bg: "bg-blue-100",
        badge: "bg-blue-100 text-blue-700",
        label: "Agenda",
    },
    stock: {
        icon: Package,
        color: "text-yellow-600",
        bg: "bg-yellow-100",
        badge: "bg-yellow-100 text-yellow-700",
        label: "Stock",
    },
    lead: {
        icon: UserPlus,
        color: "text-emerald-600",
        bg: "bg-emerald-100",
        badge: "bg-emerald-100 text-emerald-700",
        label: "Paciente",
    },
    alerta: {
        icon: AlertTriangle,
        color: "text-red-600",
        bg: "bg-red-100",
        badge: "bg-red-100 text-red-700",
        label: "Alerta",
    },
    info: {
        icon: Info,
        color: "text-slate-500 dark:text-slate-400",
        bg: "bg-slate-100 dark:bg-slate-800",
        badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
        label: "Info",
    },
} as const;

export function Header() {
    const { user, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const { notifications, unreadCount, loading, handleMarkRead, handleMarkAllRead } = useNotifications();

    const handleNotifClick = async (id: string, link?: string) => {
        await handleMarkRead(id);
        if (link) router.push(link);
    };

    const handleSeedDemo = async () => {
        const clinicId = (user as any)?.clinic_id;
        if (!user?.id || !clinicId) return;
        const res = await seedNotifications(clinicId);
        if (res.success) toast.success("Notificaciones de demo creadas");
        else toast.error("Error: " + res.error);
    };

    return (
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-950 border-b h-16 flex items-center justify-between px-6 shadow-sm">
            {/* Left */}
            <div className="flex items-center gap-4 flex-1">
                <div className="relative max-w-sm w-full hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                    <Input
                        placeholder="Buscar pacientes..."
                        className="pl-9 h-9 bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                </div>
                <div className="md:hidden font-bold text-xl text-accent">Livio</div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 md:gap-4">
                {user?.role && (
                    <Badge variant="outline" className={cn(
                        "hidden sm:flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border",
                        user.role === "superadmin" ? "bg-slate-900 text-white border-slate-900" :
                            user.role === "recepcionista" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-accent/10 text-accent border-accent/30"
                    )}>
                        {user.role === "superadmin" ? "Dueño" : user.role === "recepcionista" ? "Recepción" : "Dentista"}
                    </Badge>
                )}

                {/* Campanita */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative text-slate-500 dark:text-slate-400 hover:text-accent transition-colors">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full border-2 border-white dark:border-slate-950 leading-none">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-96 p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800"
                        sideOffset={8}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-white font-bold text-sm flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-accent" />
                                    Notificaciones
                                </p>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    {unreadCount === 0 ? "Todo al día" : `${unreadCount} sin leer`}
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={(e) => { e.preventDefault(); handleMarkAllRead(); }}
                                    className="flex items-center gap-1 text-xs text-accent hover:text-emerald-300 font-semibold transition-colors"
                                >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    Leer todas
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <div className="flex items-center justify-center py-10 text-slate-400">
                                    <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                                    <Bell className="h-7 w-7 text-slate-200" />
                                    <p className="text-sm font-medium">Sin notificaciones</p>
                                    <button
                                        onClick={handleSeedDemo}
                                        className="text-xs text-accent hover:underline mt-1"
                                    >
                                        Generar demo
                                    </button>
                                </div>
                            ) : (
                                notifications.map((notif) => {
                                    const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;
                                    const Icon = config.icon;
                                    return (
                                        <button
                                            key={notif.id}
                                            onClick={() => handleNotifClick(notif.id, notif.link)}
                                            className={cn(
                                                "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-900 transition-colors group",
                                                notif.unread && "bg-blue-50/40"
                                            )}
                                        >
                                            {/* Ícono con color */}
                                            <div className={cn("mt-0.5 shrink-0 rounded-full p-2", config.bg)}>
                                                <Icon className={cn("h-3.5 w-3.5", config.color)} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                                                        {notif.title}
                                                    </p>
                                                    {notif.unread && (
                                                        <span className="shrink-0 w-2 h-2 rounded-full bg-accent" />
                                                    )}
                                                </div>
                                                {notif.body && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{notif.body}</p>
                                                )}
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-1">
                                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                                                </p>
                                            </div>

                                            {/* Tipo badge */}
                                            <span className={cn("shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1", config.badge)}>
                                                {config.label}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-slate-900 text-center">
                                <span className="text-xs text-slate-400">
                                    Mostrando las últimas {notifications.length} notificaciones
                                </span>
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

                {/* Profile dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-2 hover:ring-2 hover:ring-accent/20 transition-all">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-accent/10 text-accent font-bold">
                                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "?"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {authLoading && !user
                                        ? <span className="inline-block w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        : (user?.full_name || user?.user_metadata?.full_name || "Usuario")}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
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
                        <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                            onClick={() => signOut()}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
