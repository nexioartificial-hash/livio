"use client";

import { useSidebar } from "@/providers/sidebar-provider";

export function SidebarAwareMain({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebar();
    return (
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? "md:ml-20" : "md:ml-64"}`}>
            {children}
        </div>
    );
}
