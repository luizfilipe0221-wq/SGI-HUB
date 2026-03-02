/**
 * useAuth — Módulo Gestão de Prédios
 * Lê a sessão real do administrador salva em localStorage pelo sistema SGI.
 * Em vez de um usuário stub falso, usa os dados reais de quem está logado.
 * Nenhum Supabase Auth é necessário — o SGI já gerencia autenticação.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getAdminSession } from '@/lib/auth';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

function buildUserFromAdminSession(): User | null {
    const admin = getAdminSession();
    if (!admin) return null;

    // Monta um objeto User compatível com o tipo do Supabase,
    // usando os dados reais do administrador logado no SGI.
    return {
        id: String(admin.id),
        app_metadata: { provider: 'sgi', providers: ['sgi'] },
        user_metadata: { name: admin.nome },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: admin.email,
        role: 'authenticated',
        updated_at: new Date().toISOString(),
        identities: [],
        factors: [],
        confirmed_at: new Date().toISOString(),
    } as User;
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lê a sessão real do SGI ao montar
        const u = buildUserFromAdminSession();
        setUser(u);
        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                session: null,
                loading,
                signUp: async () => ({ error: null }),
                signIn: async () => ({ error: null }),
                signOut: async () => { },
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}
