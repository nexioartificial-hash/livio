"use client";

import { useAuth } from "@/providers/auth-provider";
import {
    Bell,
    Search,
    User,
    Settings,
    LogOut,
    Menu
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

export function Header() {
    const { user, signOut } = useAuth();

    // Mock initial for avatar if no photo
    const userInitial = user?.email?.[0].toUpperCase() ?? "U";

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

                <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-[#76D7B6]">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </Button>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-2 hover:ring-2 hover:ring-[#76D7B6]/20 transition-all">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-[#76D7B6]/10 text-[#76D7B6] font-bold">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || "Dr. Usuario"}</p>
                                <p className="text-xs leading-none text-slate-500">{user?.email}</p>
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
