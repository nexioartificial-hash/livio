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

    const router = useRouter();

    const fetchProfileAndClinic = async (userId: string) => {
        try {
            const { data: profile, error: pError } = await supabase
                .from("professional")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (pError) throw pError;

            let finalProfile = profile;
            if (!profile) {
                // New user — create with limited role (profesional, no clinic yet)
                const { data: newProfile, error: iError } = await supabase
                    .from("professional")
                    .insert({ id: userId, role: 'profesional', is_onboarded: false })
                    .select("*")
                    .single();
                if (iError) throw iError;
                finalProfile = newProfile;
            }

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
            console.error("[Auth] Error in fetchProfileAndClinic:", err);
            return { profile: null, clinic: null };
        }
    };

    useEffect(() => {
        const globalTimeout = setTimeout(() => {
            setLoading(false);
        }, 30000);

        const getSessionWithTimeout = async () => {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<any>((resolve) =>
                setTimeout(() => resolve({ data: { session: null }, error: 'timeout' }), 20000)
            );

            try {
                const { data } = await Promise.race([sessionPromise, timeoutPromise]);
                const session = (data as any)?.session !== undefined ? (data as any).session : (data as any);

                setSession(session);

                if (session?.user) {
                    const { profile, clinic: cData } = await fetchProfileAndClinic(session.user.id);
                    if (profile) {
                        const enrichedUser = { ...session.user, ...profile };
                        setUser(enrichedUser);
                        setClinic(cData);
                    }
                } else {
                    setUser(null);
                    setClinic(null);
                }
            } catch (err) {
                console.error("[Auth] Error in getSession:", err);
            } finally {
                setLoading(false);
                clearTimeout(globalTimeout);
            }
        };

        getSessionWithTimeout();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                try {
                    setSession(session);
                    if (session?.user) {
                        const { profile, clinic: cData } = await fetchProfileAndClinic(session.user.id);
                        if (profile) {
                            const enrichedUser = { ...session.user, ...profile };
                            setUser(enrichedUser);
                            setClinic(cData);
                        }
                    } else {
                        setUser(null);
                        setClinic(null);
                    }
                } catch (err) {
                    console.error("[Auth] Error in onAuthStateChange:", err);
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
        const performSignOut = async () => {
            try {
                await supabase.auth.signOut().catch(err => console.warn("[Auth] signOut warning:", err));
                document.cookie = 'livio_remember_me=; path=/; max-age=0; SameSite=Lax';
                await logoutAction().catch(err => console.warn("[Auth] logoutAction warning:", err));
            } catch (error) {
                console.error("[Auth] Error during sign out:", error);
            }
        };

        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
        await Promise.race([performSignOut(), timeoutPromise]);
        window.location.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ session, user, clinic, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
