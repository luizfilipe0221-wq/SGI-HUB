/**
 * ListaTelefonicaModule
 * Módulo independente da Lista Telefônica.
 * Contém toda a UI, abas e lógica de navegação interna.
 * O AdminDashboard apenas instancia este componente — sem conhecer seus detalhes.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSession, logoutAdmin } from "@/lib/auth";
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

const TABS = [
    { key: "overview", label: "Dashboard", title: "Dashboard", subtitle: "Visão geral das ligações e resultados" },
    { key: "contatos", label: "Contatos", title: "Contatos", subtitle: "Gerencie todos os contatos cadastrados" },
    { key: "create", label: "Criar Lista", title: "Criar Lista", subtitle: "Crie uma nova lista de ligações" },
    { key: "manage", label: "Listas", title: "Listas", subtitle: "Gerencie suas listas de ligações" },
    { key: "results", label: "Resultados", title: "Resultados", subtitle: "Acompanhe os resultados das ligações" },
    { key: "retornos", label: "Retornos", title: "Retornos", subtitle: "Contatos aguardando novo contato" },
    { key: "territorios", label: "Territórios", title: "Territórios", subtitle: "Relatório por território" },
] as const;

type TabKey = typeof TABS[number]["key"];

interface Props {
    admin: AdminSession;
}

export function ListaTelefonicaModule({ admin }: Props) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [contatosStatusFilter, setContatosStatusFilter] = useState<string | undefined>();

    const handleLogout = () => {
        logoutAdmin();
        navigate("/admin/login");
    };

    function navigateTab(tab: string, filter?: string) {
        setContatosStatusFilter(tab === "contatos" && filter ? filter : undefined);
        setActiveTab(tab as TabKey);
    }

    const current = TABS.find((t) => t.key === activeTab)!;

    return (
        <div className="min-h-screen">
            {/* Module Header */}
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10">
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
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                    <TabsList>
                        {TABS.map((tab) => (
                            <TabsTrigger key={tab.key} value={tab.key} className="text-[13px]">
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* Page Title */}
            <main className="px-6 py-6">
                <div className="mb-6">
                    <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-foreground">
                        {current.title}
                    </h1>
                    <p className="text-[13px] text-muted-foreground mt-1">{current.subtitle}</p>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
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
    );
}
