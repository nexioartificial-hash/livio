"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface AuthContextType {
    session: Session | null;
    user: (User & { role?: string }) | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<(User & { role?: string }) | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchProfile = async (userId: string) => {
        console.log("🔍 [Auth] Intentando obtener perfil para ID:", userId);

        // Timeout protection for the profile fetch
        const profilePromise = (async () => {
            try {
                const { data: profile, error } = await supabase
                    .from("professional")
                    .select("role")
                    .eq("id", userId)
                    .maybeSingle();

                if (error) {
                    console.error("❌ [Auth] Error en Supabase Query:", error);
                    return null;
                }

                if (!profile) {
                    console.warn("⚠️ [Auth] Registro no encontrado. Creando perfil superadmin...");
                    const { data: newProfile, error: insertError } = await supabase
                        .from("professional")
                        .insert({ id: userId, role: 'superadmin', is_onboarded: false })
                        .select("role")
                        .single();

                    if (insertError) {
                        console.error("❌ [Auth] Error al crear perfil:", insertError.message);
                        return null;
                    }
                    return newProfile;
                }

                return profile;
            } catch (err) {
                console.error("🔥 [Auth] Error inesperado en fetchProfile:", err);
                return null;
            }
        })();

        const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => {
                console.warn("🕒 [Auth] Profile fetch timed out (4s)");
                resolve(null);
            }, 4000)
        );

        return Promise.race([profilePromise, timeoutPromise]);
    };

    useEffect(() => {
        console.log("DEBUG: Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

        // Global safety timeout to ensure setLoading(false) always happens
        const globalTimeout = setTimeout(() => {
            if (loading) {
                console.warn("🚨 [Auth] Auth initialization took too long (8s). Forcing loading: false");
                setLoading(false);
            }
        }, 8000);

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            console.log("🔐 [Auth] Sesión inicial detectada:", session?.user?.email);
            try {
                setSession(session);
                if (session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    console.log("👤 [Auth] Perfil procesado, rol:", profile?.role);
                    setUser({ ...session.user, role: profile?.role });
                } else {
                    console.log("👤 [Auth] No hay usuario en sesión");
                    setUser(null);
                }
            } catch (err) {
                console.error("❌ [Auth] Error en flujo inicial:", err);
            } finally {
                setLoading(false);
                clearTimeout(globalTimeout);
                console.log("🔓 [Auth] Loading set to false");
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                console.log("🔄 [Auth] Cambio de estado:", _event, session?.user?.email);
                try {
                    setSession(session);
                    if (session?.user) {
                        const profile = await fetchProfile(session.user.id);
                        setUser({ ...session.user, role: profile?.role });
                    } else {
                        setUser(null);
                    }
                } catch (err) {
                    console.error("❌ [Auth] Error en cambio de estado:", err);
                } finally {
                    setLoading(false);
                    console.log("🔓 [Auth] Loading set to false (onAuthStateChange)");
                }

                if (_event === "SIGNED_OUT") {
                    setUser(null);
                    setSession(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
            clearTimeout(globalTimeout);
        };
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            // Hard navigation clears all state and avoids double-redirect race
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
