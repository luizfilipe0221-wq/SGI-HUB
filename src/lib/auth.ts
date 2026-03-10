import { supabase } from "@/integrations/supabase/client";
import { supabaseQuery } from "@/lib/supabaseHelper";

export interface AdminSession {
  id: number;
  nome: string;
  email: string;
}

export async function loginAdmin(email: string, senha: string): Promise<AdminSession> {
  const data = await supabaseQuery(async () => await supabase.rpc("verificar_login", {
          p_email: email.toLowerCase().trim(),
          p_senha: senha,
        }));

  if (error) {
    throw new Error("Email ou senha incorretos.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.autenticado) {
    throw new Error("Email ou senha incorretos.");
  }

  const session: AdminSession = { id: row.id, nome: row.nome, email: row.email };
  localStorage.setItem("calldesk_admin", JSON.stringify(session));
  return session;
}

export function getAdminSession(): AdminSession | null {
  const raw = localStorage.getItem("calldesk_admin");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function logoutAdmin() {
  localStorage.removeItem("calldesk_admin");
}
