"use client";

import { useAuth } from "@/providers/auth-provider";
import { NotificationsProvider } from "@/providers/notifications-provider";

export function NotificationsWrapper({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    return (
        <NotificationsProvider userId={user?.id ?? null}>
            {children}
        </NotificationsProvider>
    );
}
