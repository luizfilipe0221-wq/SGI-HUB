import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminSession, logoutAdmin, AdminSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Phone } from "lucide-react";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { ContatosTab } from "@/components/admin/ContatosTab";
import { CreateListTab } from "@/components/admin/CreateListTab";
import { ManageListsTab } from "@/components/admin/ManageListsTab";
import { ResultsTab } from "@/components/admin/ResultsTab";
import { RetornosTab } from "@/components/admin/RetornosTab";
import { TerritoriosTab } from "@/components/admin/TerritoriosTab";
import { SgiLayout } from "@/components/layout/SgiLayout";
import GestaoPredios from "@/pages/GestaoPredios";

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [contatosStatusFilter, setContatosStatusFilter] = useState<string | undefined>();
  const [activeModule, setActiveModule] = useState<"lista-telefonica" | "gestao-predios">(
    "lista-telefonica"
  );
  const navigate = useNavigate();

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      navigate("/admin/login");
      return;
    }
    setAdmin(session);
  }, [navigate]);

  const handleLogout = () => {
    logoutAdmin();
    navigate("/admin/login");
  };

  function navigateTab(tab: string, filter?: string) {
    if (tab === "contatos" && filter) {
      setContatosStatusFilter(filter);
    } else {
      setContatosStatusFilter(undefined);
    }
    setActiveTab(tab);
  }

  if (!admin) return null;

  const tabLabels: Record<string, string> = {
    overview: "Dashboard",
    contatos: "Contatos",
    create: "Criar Lista",
    manage: "Listas",
    results: "Resultados",
    retornos: "Retornos",
    territorios: "Territorios",
  };

  const tabTitle: Record<string, { title: string; subtitle: string }> = {
    overview: { title: "Dashboard", subtitle: "Visão geral das ligações e resultados" },
    contatos: { title: "Contatos", subtitle: "Gerencie todos os contatos cadastrados" },
    create: { title: "Criar Lista", subtitle: "Crie uma nova lista de ligações" },
    manage: { title: "Listas", subtitle: "Gerencie suas listas de ligações" },
    results: { title: "Resultados", subtitle: "Acompanhe os resultados das ligações" },
    retornos: { title: "Retornos", subtitle: "Contatos aguardando novo contato" },
    territorios: { title: "Territórios", subtitle: "Relatório por território" },
  };

  return (
    <SgiLayout activeModule={activeModule} onChangeModule={setActiveModule}>
      {/* ──── GESTÃO DE PRÉDIOS ──── */}
      {activeModule === "gestao-predios" && <GestaoPredios />}

      {/* ──── LISTA TELEFÔNICA ──── */}
      {activeModule === "lista-telefonica" && (
        <div className="min-h-screen">
          {/* Module Header */}
          <div className="px-6 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,122,255,0.10)" }}
              >
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
                  Lista Telefônica
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  Sistema de gerenciamento de listas e contatos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-muted-foreground hidden sm:block">{admin.nome}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Sair
              </Button>
            </div>
          </div>

          {/* Inner Tab Navigation */}
          <div className="px-6 pt-3 pb-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {Object.entries(tabLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="text-[13px]">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Page Title */}
          <main className="px-6 py-6">
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-foreground">
                {tabTitle[activeTab]?.title}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {tabTitle[activeTab]?.subtitle}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="overview">
                <OverviewTab onNavigateTab={navigateTab} />
              </TabsContent>
              <TabsContent value="contatos">
                <ContatosTab key={contatosStatusFilter} initialStatusFilter={contatosStatusFilter} />
              </TabsContent>
              <TabsContent value="create">
                <CreateListTab />
              </TabsContent>
              <TabsContent value="manage">
                <ManageListsTab />
              </TabsContent>
              <TabsContent value="results">
                <ResultsTab />
              </TabsContent>
              <TabsContent value="retornos">
                <RetornosTab />
              </TabsContent>
              <TabsContent value="territorios">
                <TerritoriosTab />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      )}
    </SgiLayout>
  );
}
