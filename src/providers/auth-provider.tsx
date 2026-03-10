"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/logout";

interface AuthContextType {
    session: Session | null;
    user: (User & { role?: string; clinic_id?: string; full_name?: string }) | null;
    clinic: any | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    clinic: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [clinic, setClinic] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial load from cache to be "instantaneous"
    useEffect(() => {
        const cachedUser = localStorage.getItem('livio_user_cache');
        const cachedClinic = localStorage.getItem('livio_clinic_cache');
        if (cachedUser) setUser(JSON.parse(cachedUser));
        if (cachedClinic) setClinic(JSON.parse(cachedClinic));
    }, []);
    const router = useRouter();

    const fetchProfileAndClinic = async (userId: string) => {
        console.log("🔍 [Auth] Obteniendo perfil y clínica para:", userId);
        try {
            // 1. Get Professional Profile
            const { data: profile, error: pError } = await supabase
                .from("professional")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (pError) throw pError;

            let finalProfile = profile;
            if (!profile) {
                console.warn("⚠️ [Auth] Perfil no encontrado. Creando superadmin...");
                const { data: newProfile, error: iError } = await supabase
                    .from("professional")
                    .insert({ id: userId, role: 'superadmin', is_onboarded: false })
                    .select("*")
                    .single();
                if (iError) throw iError;
                finalProfile = newProfile;
            }

            // 2. Get Clinic Data if clinic_id exists
            let clinicData = null;
            if (finalProfile?.clinic_id) {
                const { data: clinic, error: cError } = await supabase
                    .from("clinic")
                    .select("*")
                    .eq("id", finalProfile.clinic_id)
                    .maybeSingle();
                if (!cError) clinicData = clinic;
            }

            return { profile: finalProfile, clinic: clinicData };
        } catch (err) {
            console.error("🔥 [Auth] Error en fetchProfileAndClinic:", err);
            return { profile: null, clinic: null };
        }
    };

    useEffect(() => {
        // Very patient safety timeout (30s)
        const globalTimeout = setTimeout(() => {
            console.warn("🚨 [Auth] Auth initialization limit reached (30s). Forcing ready state.");
            setLoading(false);
        }, 30000);

        // Get initial session with a racing timeout (20s)
        const getSessionWithTimeout = async () => {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<any>((resolve) =>
                setTimeout(() => resolve({ data: { session: null }, error: 'timeout' }), 20000)
            );

            try {
                const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
                // Robust extraction of session object
                const session = (data as any)?.session !== undefined ? (data as any).session : (data as any);

                if (error === 'timeout') {
                    console.warn("🕒 [Auth] getSession() timed out (20s)");
                }

                console.log("🔐 [Auth] Sesión detectada:", session?.user?.email || "Ninguna");
                setSession(session);

                if (session?.user) {
                    const { profile, clinic: cData } = await fetchProfileAndClinic(session.user.id);
                    const enrichedUser = { ...session.user, ...profile };
                    setUser(enrichedUser);
                    setClinic(cData);
                    // Update cache
                    localStorage.setItem('livio_user_cache', JSON.stringify(enrichedUser));
                    if (cData) localStorage.setItem('livio_clinic_cache', JSON.stringify(cData));
                } else {
                    setUser(null);
                    setClinic(null);
                    localStorage.removeItem('livio_user_cache');
                    localStorage.removeItem('livio_clinic_cache');
                }
            } catch (err) {
                console.error("❌ [Auth] Error en getSession:", err);
                setUser(null);
            } finally {
                setLoading(false);
                clearTimeout(globalTimeout);
            }
        };

        getSessionWithTimeout();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                console.log("🔄 [Auth] Cambio de estado:", _event, session?.user?.email);
                try {
                    setSession(session);
                    if (session?.user) {
                        const { profile, clinic: cData } = await fetchProfileAndClinic(session.user.id);
                        const enrichedUser = { ...session.user, ...profile };
                        setUser(enrichedUser);
                        setClinic(cData);
                        localStorage.setItem('livio_user_cache', JSON.stringify(enrichedUser));
                        if (cData) localStorage.setItem('livio_clinic_cache', JSON.stringify(cData));
                    } else {
                        setUser(null);
                        setClinic(null);
                        localStorage.removeItem('livio_user_cache');
                        localStorage.removeItem('livio_clinic_cache');
                    }
                } catch (err) {
                    console.error("❌ [Auth] Error en onAuthStateChange:", err);
                } finally {
                    setLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
            clearTimeout(globalTimeout);
        };
    }, []);

    const signOut = async () => {
        console.log("🚪 [Auth] Cerrando sesión...");
        
        // 1. Clear localStorage Cache immediately for instant UI feedback
        localStorage.removeItem('livio_user_cache');
        localStorage.removeItem('livio_clinic_cache');
        
        const performSignOut = async () => {
            try {
                // 2. Sign out from Supabase (Client)
                await supabase.auth.signOut().catch(err => console.warn("⚠️ [Auth] Supabase signOut warning:", err));
                
                // 3. Delete cookie from client side
                document.cookie = 'livio_remember_me=; path=/; max-age=0; SameSite=Lax';

                // 4. Call Server Action to clear HTTP-only cookies
                await logoutAction().catch(err => console.warn("⚠️ [Auth] logoutAction warning:", err));
                
                console.log("✅ [Auth] Sesión cerrada físicamente.");
            } catch (error) {
                console.error("❌ [Auth] Error durante el proceso de salida:", error);
            }
        };

        // 5. Safety timeout: if server/network is slow, force redirect anyway in 2s
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
        
        await Promise.race([performSignOut(), timeoutPromise]);
        
        // 6. Final absolute redirect
        console.log("🚀 [Auth] Redirigiendo a login (forced)");
        window.location.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ session, user, clinic, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
