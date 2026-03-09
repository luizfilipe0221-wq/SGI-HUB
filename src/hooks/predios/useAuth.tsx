/**
 * useAuth — Módulo Gestão de Prédios
 * Usa o mesmo client Supabase do banco principal.
 * O módulo acessa dados via anon key + RLS, sem necessidade de login separado.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabasePredios } from '@/integrations/supabase/predios';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signUp: async () => ({ error: null }),
    signIn: async () => ({ error: null }),
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar sessão existente
        supabasePredios.auth.getSession().then(({ data: { session: existing } }) => {
            setSession(existing);
            setUser(existing?.user ?? null);
            setLoading(false);
        });

        // Ouvir mudanças de auth
        const { data: { subscription } } = supabasePredios.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            setUser(s?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{
            user, session, loading,
            signUp: async () => ({ error: null }),
            signIn: async () => ({ error: null }),
            signOut: async () => { await supabasePredios.auth.signOut(); },
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}
