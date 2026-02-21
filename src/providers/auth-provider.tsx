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
        try {
            const { data: profile, error } = await supabase
                .from("professional")
                .select("role")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                console.error("❌ [Auth] Error en Supabase Query");
                console.error("--- Error Details ---");
                console.error("Message:", error.message || "n/a");
                console.error("Code:", error.code || "n/a");
                console.error("Details:", error.details || "n/a");
                console.error("Hint:", error.hint || "n/a");
                console.error("---------------------");
                return null;
            }

            if (!profile) {
                console.warn("⚠️ [Auth] Registro no encontrado. Creando perfil superadmin automáticamente...");
                const { data: newProfile, error: insertError } = await supabase
                    .from("professional")
                    .insert({ id: userId, role: 'superadmin', is_onboarded: false })
                    .select("role")
                    .single();

                if (insertError) {
                    console.error("❌ [Auth] Error al crear perfil:", insertError.message);
                    return null;
                }
                console.log("✅ [Auth] Perfil superadmin creado:", newProfile);
                return newProfile;
            }

            console.log("✅ [Auth] Perfil cargado satisfactoriamente:", profile);
            return profile;
        } catch (err) {
            console.error("🔥 [Auth] Error inesperado (Exception):", err);
            return null;
        }
    };

    useEffect(() => {
        console.log("DEBUG: Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            console.log("🔐 Initial session:", session?.user?.email);
            setSession(session);
            if (session?.user) {
                const profile = await fetchProfile(session.user.id);
                console.log("👤 Setting user with role:", profile?.role);
                setUser({ ...session.user, role: profile?.role });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                console.log("🔄 Auth state change:", _event, session?.user?.email);
                setSession(session);
                if (session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    setUser({ ...session.user, role: profile?.role });
                } else {
                    setUser(null);
                }
                setLoading(false);

                if (_event === "SIGNED_OUT") {
                    setUser(null);
                    setSession(null);
                    // Hard redirect is handled by signOut() below
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

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
