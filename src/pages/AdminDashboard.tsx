/**
 * AdminDashboard
 * Orquestrador de sessão e seletor de módulos do SGI.
 * Conecta o activeTab do ListaTelefonicaModule com os nav items do SgiLayout sidebar.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminSession, AdminSession } from "@/lib/auth";
import { SgiLayout } from "@/components/layout/SgiLayout";
import { ListaTelefonicaModule } from "@/components/lista-telefonica/ListaTelefonicaModule";

type TabKey = "overview" | "contatos" | "create" | "manage" | "results" | "retornos" | "territorios";

const TAB_TITLES: Record<TabKey, string> = {
  overview: "Dashboard",
  contatos: "Contatos",
  create: "Criar Lista",
  manage: "Listas",
  results: "Resultados",
  retornos: "Retornos",
  territorios: "Territórios",
};

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const navigate = useNavigate();

  useEffect(() => {
    const session = getAdminSession();
    if (!session) { navigate("/admin/login"); return; }
    setAdmin(session);
  }, [navigate]);

  if (!admin) return null;

  return (
    <SgiLayout
      activeModule="lista-telefonica"
      onChangeModule={(mod) => { if (mod === "gestao-predios") navigate("/predios"); }}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as TabKey)}
      pageTitle={TAB_TITLES[activeTab]}
    >
      <ListaTelefonicaModule
        admin={admin}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabKey)}
      />
    </SgiLayout>
  );
}
