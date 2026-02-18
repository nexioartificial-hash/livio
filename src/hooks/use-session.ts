"use client";

import { useAuth } from "@/providers/auth-provider";

export const useSession = () => {
    const { session, loading } = useAuth();

    return {
        data: {
            session
        },
        status: loading ? "loading" : session ? "authenticated" : "unauthenticated"
    };
};
