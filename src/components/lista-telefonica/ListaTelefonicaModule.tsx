/**
 * ListaTelefonicaModule
 * Módulo de conteúdo puro da Lista Telefônica.
 * Recebe activeTab/onTabChange do AdminDashboard (que os compartilha com o sidebar).
 * Sem header próprio — o SgiLayout topbar + sidebar são o shell.
 */
import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdminSession } from "@/lib/auth";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { ContatosTab } from "@/components/admin/ContatosTab";
import { CreateListTab } from "@/components/admin/CreateListTab";
import { ManageListsTab } from "@/components/admin/ManageListsTab";
import { ResultsTab } from "@/components/admin/ResultsTab";
import { RetornosTab } from "@/components/admin/RetornosTab";
import { TerritoriosTab } from "@/components/admin/TerritoriosTab";

type TabKey = "overview" | "contatos" | "create" | "manage" | "results" | "retornos" | "territorios";

interface Props {
    admin: AdminSession;
    activeTab: TabKey;
    onTabChange: (tab: string) => void;
}

const SUBTITLES: Record<TabKey, string> = {
    overview: "Visão geral das ligações e resultados",
    contatos: "Gerencie todos os contatos cadastrados",
    create: "Crie uma nova lista de ligações",
    manage: "Gerencie suas listas de ligações",
    results: "Acompanhe os resultados das ligações",
    retornos: "Contatos aguardando novo contato",
    territorios: "Relatório por território",
};

export function ListaTelefonicaModule({ admin, activeTab, onTabChange }: Props) {
    const [contatosStatusFilter, setContatosStatusFilter] = useState<string | undefined>();

    function navigateTab(tab: string, filter?: string) {
        setContatosStatusFilter(tab === "contatos" && filter ? filter : undefined);
        onTabChange(tab);
    }

    return (
        <div>
            {/* Page subtitle */}
            <p className="text-[13px] mb-6" style={{ color: "#9CA3AF" }}>
                {SUBTITLES[activeTab]}
            </p>

            <Tabs value={activeTab} onValueChange={onTabChange}>
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
        </div>
    );
}
