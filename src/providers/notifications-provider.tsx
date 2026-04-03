"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import type { Notification } from "@/app/actions/notifications";

interface NotificationsContextValue {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    handleMarkRead: (id: string) => Promise<void>;
    handleMarkAllRead: () => Promise<void>;
    refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    handleMarkRead: async () => {},
    handleMarkAllRead: async () => {},
    refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

const TYPE_LABELS: Record<string, string> = {
    agenda: "📅 Agenda",
    stock: "📦 Stock",
    lead: "🧑 Paciente",
    alerta: "⚠️ Alerta",
    info: "ℹ️ Info",
};

interface NotificationsProviderProps {
    children: React.ReactNode;
    userId: string | null;
}

export function NotificationsProvider({ children, userId }: NotificationsProviderProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!userId) return;
        const res = await getNotifications();
        if (res.success && res.data) {
            setNotifications(res.data);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        // Fetch initial notifications (async IIFE to avoid direct setState in effect body)
        const controller = new AbortController();
        (async () => {
            const res = await getNotifications();
            if (!controller.signal.aborted && res.success && res.data) {
                setNotifications(res.data);
            }
            if (!controller.signal.aborted) setLoading(false);
        })();

        // Supabase Realtime subscribe
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const notif = payload.new as Notification;
                    setNotifications((prev) => [notif, ...prev]);
                    // Toast al recibir la notificación en tiempo real
                    toast(notif.title, {
                        description: notif.body,
                        duration: 5000,
                        icon: TYPE_LABELS[notif.type]?.charAt(0) ?? "🔔",
                    });
                }
            )
            .subscribe();

        return () => {
            controller.abort();
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const handleMarkRead = useCallback(async (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
        );
        await markAsRead(id);
    }, []);

    const handleMarkAllRead = useCallback(async () => {
        if (!userId) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
        await markAllAsRead();
    }, [userId]);

    const unreadCount = notifications.filter((n) => n.unread).length;

    return (
        <NotificationsContext.Provider value={{ notifications, unreadCount, loading, handleMarkRead, handleMarkAllRead, refresh }}>
            {children}
        </NotificationsContext.Provider>
    );
}
