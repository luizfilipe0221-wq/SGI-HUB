/**
 * AdminDashboard
 * Orquestrador de sessão e seletor de módulos do SGI.
 * Responsabilidades: verificar sessão, redirecionar módulos.
 * Toda a lógica de UI está nos módulos filhos.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminSession, AdminSession } from "@/lib/auth";
import { SgiLayout } from "@/components/layout/SgiLayout";
import { ListaTelefonicaModule } from "@/components/lista-telefonica/ListaTelefonicaModule";

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      navigate("/admin/login");
      return;
    }
    setAdmin(session);
  }, [navigate]);

  if (!admin) return null;

  return (
    <SgiLayout
      activeModule="lista-telefonica"
      onChangeModule={(mod) => {
        if (mod === "gestao-predios") navigate("/predios");
      }}
    >
      <ListaTelefonicaModule admin={admin} />
    </SgiLayout>
  );
}
